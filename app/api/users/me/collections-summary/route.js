import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { collectionPreviews } from "@/lib/registry";

// Résumé "par collection" des cartes possédées/recherchées de l'utilisateur connecté —
// une ligne par collection avec une fraction (ex. 22/25), plutôt que la liste exhaustive de
// chaque carte : reste lisible même avec plusieurs centaines de cartes suivies.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const entries = await prisma.userCard.findMany({
      where: { userId: session.sub },
      select: { status: true, card: { select: { collectionId: true, numero: true } } },
    });

    const collectionIds = [...new Set(entries.map((e) => e.card.collectionId))];
    // Visuel de chaque collection : le même que sur la page Collections (première carte
    // scannée, sinon la couverture).
    const [collections, catalogue, previews] = collectionIds.length
      ? await Promise.all([
          prisma.collection.findMany({
            where: { id: { in: collectionIds } },
            select: { id: true, nom: true, total: true, cover: true },
          }),
          prisma.card.findMany({ where: { collectionId: { in: collectionIds } }, select: { collectionId: true, numero: true } }),
          collectionPreviews(collectionIds),
        ])
      : [[], [], new Map()];
    const collectionById = new Map(collections.map((c) => [c.id, c]));

    // On compte des références (numéros) et non des cartes : les variantes d'effet d'un même
    // numéro ne comptent qu'une fois, comme pour une collection complète (lib/completion.js).
    function distinctNumeros(rows) {
      const sets = new Map();
      for (const { collectionId, numero } of rows) {
        if (!sets.has(collectionId)) sets.set(collectionId, new Set());
        sets.get(collectionId).add(numero);
      }
      return new Map([...sets].map(([id, set]) => [id, set.size]));
    }
    const cataloguedById = distinctNumeros(catalogue);

    function summarize(status) {
      const counts = distinctNumeros(entries.filter((e) => e.status === status).map((e) => e.card));
      return [...counts.entries()]
        .map(([collectionId, count]) => {
          const col = collectionById.get(collectionId);
          return {
            collectionId,
            nom: col?.nom || "",
            cover: col?.cover || null,
            previewImage: previews.get(collectionId) || col?.cover || null,
            count,
            total: col?.total || null,
            catalogued: cataloguedById.get(collectionId) || count,
          };
        })
        .sort((a, b) => a.nom.localeCompare(b.nom));
    }

    return NextResponse.json({ owned: summarize("owned"), wanted: summarize("wanted") });
  } catch (e) {
    console.error("Erreur GET /api/users/me/collections-summary :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
