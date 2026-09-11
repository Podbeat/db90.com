import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateFreeText } from "@/lib/translate";
import { naturalSortByNumero } from "@/lib/naturalSort";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const collectionId = searchParams.get("collectionId");
    const rarete = searchParams.get("rarete");
    const personnage = searchParams.get("personnage");
    const pays = searchParams.get("pays");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "40", 10)));

    const where = {
      AND: [
        collectionId && collectionId !== "all" ? { collectionId } : {},
        rarete && rarete !== "all" ? { rarete } : {},
        personnage && personnage !== "all" ? { personnage } : {},
        pays && pays !== "all" ? { collection: { pays } } : {},
        q
          ? {
              OR: [
                { personnage: { contains: q, mode: "insensitive" } },
                { numero: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    // Le tri par référence se fait "naturellement" (4 < 10 < 16) plutôt qu'en texte brut
    // (10 < 16 < 4) : impossible à exprimer proprement en SQL pour des références mixtes,
    // donc on récupère tout le lot filtré, on trie côté serveur, puis on pagine à la main.
    const allMatching = await prisma.card.findMany({
      where,
      include: { collection: { select: { nom: true, pays: true } } },
      orderBy: [{ collectionId: "asc" }],
    });
    allMatching.sort(naturalSortByNumero);

    const total = allMatching.length;
    const cards = allMatching.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({ cards, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (e) {
    console.error("Erreur GET /api/cards :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const body = await request.json();
    if (!body.personnage || !body.numero || !body.collectionId) {
      return NextResponse.json({ error: "Référence, personnage et collection sont obligatoires." }, { status: 400 });
    }

    const translations = await translateFreeText(body.description);

    const card = await prisma.card.create({
      data: {
        numero: body.numero,
        personnage: body.personnage,
        rarete: body.rarete || "Commune",
        description: body.description || null,
        descriptionEn: translations.en,
        descriptionZhTW: translations.zhTW,
        descriptionZhCN: translations.zhCN,
        contributeur: body.contributeur || null,
        image: body.image || null,
        imageHD: body.imageHD || body.image || null,
        dos: body.dos || null,
        dosHD: body.dosHD || body.dos || null,
        collectionId: body.collectionId,
      },
    });
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/cards :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
