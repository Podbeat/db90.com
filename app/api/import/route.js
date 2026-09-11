import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateFreeText } from "@/lib/translate";

export const runtime = "nodejs";
export const maxDuration = 60;

// Colonnes attendues dans le fichier CSV (en-têtes insensibles à la casse) :
// collection, numero, personnage, rarete, description, image
// "image" doit correspondre exactement au nom du fichier scan.
//
// Les images elles-mêmes ne transitent plus par cette route : chaque fichier est envoyé
// directement au stockage depuis le navigateur (voir lib/clientUpload.js), qui fournit ici
// un simple "imageMap" (nom de fichier → URLs déjà traitées). Ça évite d'envoyer plusieurs
// fichiers volumineux d'un coup à la fonction serveur, qui a une limite de taille de requête.

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const formData = await request.formData();
    const sheetFile = formData.get("sheet");
    const imageMapRaw = formData.get("imageMap");

    if (!sheetFile) {
      return NextResponse.json({ error: "Aucun fichier de métadonnées (CSV) reçu." }, { status: 400 });
    }

    let imageMap = {};
    try {
      imageMap = imageMapRaw ? JSON.parse(imageMapRaw) : {};
    } catch (e) {
      return NextResponse.json({ error: "Format d'imageMap invalide." }, { status: 400 });
    }

    const sheetText = await sheetFile.text();
    const rows = parseCSV(sheetText);

    const collectionCache = new Map();
    async function getOrCreateCollection(nom) {
      if (!nom) return null;
      const key = nom.toLowerCase();
      if (collectionCache.has(key)) return collectionCache.get(key);

      let collection = await prisma.collection.findFirst({
        where: { nom: { equals: nom, mode: "insensitive" } },
      });
      if (!collection) {
        collection = await prisma.collection.create({ data: { nom } });
      }
      collectionCache.set(key, collection);
      return collection;
    }

    const results = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 2; // +2 : ligne 1 = en-têtes

      try {
        if (!row.personnage || !row.numero) {
          results.errors.push(`Ligne ${lineNumber} : "personnage" et "numero" sont obligatoires.`);
          continue;
        }

        const collection = await getOrCreateCollection(row.collection || "Collection sans nom");

        const translations = await translateFreeText(row.description);

        let imageUrl = null;
        let imageHDUrl = null;
        if (row.image) {
          const uploaded = imageMap[row.image];
          if (uploaded && uploaded.url) {
            imageUrl = uploaded.url;
            imageHDUrl = uploaded.hdUrl;
          } else if (uploaded && uploaded.error) {
            results.errors.push(`Ligne ${lineNumber} : échec de l'envoi de "${row.image}" (${uploaded.error}).`);
          } else {
            results.errors.push(`Ligne ${lineNumber} : image "${row.image}" non trouvée parmi les fichiers envoyés.`);
          }
        }

        await prisma.card.create({
          data: {
            numero: row.numero,
            personnage: row.personnage,
            rarete: row.rarete || "Commune",
            description: row.description || null,
            descriptionEn: translations.en,
            descriptionZhTW: translations.zhTW,
            descriptionZhCN: translations.zhCN,
            image: imageUrl,
            imageHD: imageHDUrl,
            collectionId: collection.id,
          },
        });
        results.created += 1;
      } catch (e) {
        results.errors.push(`Ligne ${lineNumber} : ${e.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    console.error("Erreur POST /api/import :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
