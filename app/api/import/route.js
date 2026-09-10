import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import { translateFreeText } from "@/lib/translate";

export const runtime = "nodejs";

// Colonnes attendues dans le fichier CSV (en-têtes insensibles à la casse) :
// collection, numero, personnage, rarete, description, image
// "image" doit correspondre exactement au nom du fichier scan envoyé en même temps.

export async function POST(request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const formData = await request.formData();
  const sheetFile = formData.get("sheet");
  const imageFiles = formData.getAll("images");
  const watermark = formData.get("watermark") !== "false"; // true par défaut si absent

  if (!sheetFile) {
    return NextResponse.json({ error: "Aucun fichier de métadonnées (CSV) reçu." }, { status: 400 });
  }

  const sheetText = await sheetFile.text();
  const rows = parseCSV(sheetText);

  const imageByName = new Map();
  for (const file of imageFiles) {
    imageByName.set(file.name, file);
  }

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
        const file = imageByName.get(row.image);
        if (file) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const { display, hd } = await saveImage(buffer, file.name, { watermark });
          imageUrl = display;
          imageHDUrl = hd;
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
}
