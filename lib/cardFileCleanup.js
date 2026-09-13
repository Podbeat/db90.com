const { prisma } = require("./db");
const { deleteObjects } = require("./storage");

/**
 * À appeler juste après la suppression en base d'une ou plusieurs cartes : supprime leurs
 * fichiers de scan (image, imageHD, dos, dosHD) du stockage, en excluant par sécurité :
 * - les URLs correspondant au dos/dosHD partagé de leur collection (jamais propres à une carte) ;
 * - toute URL encore référencée par une carte non supprimée (en principe impossible, chaque
 *   envoi générant un nom de fichier unique, mais on vérifie quand même avant de supprimer).
 *
 * `deletedCards` doit contenir, pour chaque carte supprimée, les champs
 * { image, imageHD, dos, dosHD, collectionId } tels qu'ils étaient juste avant suppression.
 *
 * Best-effort : n'importe quelle erreur est journalisée mais jamais renvoyée à l'appelant,
 * puisque la suppression en base est déjà actée au moment où cette fonction est appelée.
 */
async function cleanupCardFiles(deletedCards) {
  try {
    const candidateUrls = new Set();
    for (const c of deletedCards || []) {
      [c.image, c.imageHD, c.dos, c.dosHD].forEach((u) => u && candidateUrls.add(u));
    }
    if (candidateUrls.size === 0) return;

    const collectionIds = [...new Set(deletedCards.map((c) => c.collectionId).filter(Boolean))];
    if (collectionIds.length > 0) {
      const collections = await prisma.collection.findMany({
        where: { id: { in: collectionIds } },
        select: { dos: true, dosHD: true },
      });
      for (const col of collections) {
        if (col.dos) candidateUrls.delete(col.dos);
        if (col.dosHD) candidateUrls.delete(col.dosHD);
      }
    }
    if (candidateUrls.size === 0) return;

    const urls = [...candidateUrls];
    const stillUsed = await prisma.card.findMany({
      where: {
        OR: [
          { image: { in: urls } },
          { imageHD: { in: urls } },
          { dos: { in: urls } },
          { dosHD: { in: urls } },
        ],
      },
      select: { image: true, imageHD: true, dos: true, dosHD: true },
    });
    for (const c of stillUsed) {
      [c.image, c.imageHD, c.dos, c.dosHD].forEach((u) => u && candidateUrls.delete(u));
    }
    if (candidateUrls.size === 0) return;

    await deleteObjects([...candidateUrls]);
  } catch (e) {
    console.error("Erreur nettoyage des fichiers de scan :", e);
  }
}

module.exports = { cleanupCardFiles };
