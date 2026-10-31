import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateFreeText } from "@/lib/translate";
import { cleanupCardFiles } from "@/lib/cardFileCleanup";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { contributionPointsOf } from "@/lib/participation";

const cardInclude = {
  collection: true,
  personnagePrincipal: true,
  personnagesSecondaires: { include: { character: true } },
};

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const card = await prisma.card.findUnique({
      where: { id },
      include: cardInclude,
    });
    if (!card) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    // Carte précédente/suivante dans la même collection (triée naturellement par
    // référence), pour permettre de naviguer sans repasser par la page de la collection.
    const siblings = await prisma.card.findMany({
      where: { collectionId: card.collectionId },
      select: { id: true, numero: true },
    });
    siblings.sort(naturalSortByNumero);
    const index = siblings.findIndex((c) => c.id === card.id);
    const prevCardId = index > 0 ? siblings[index - 1].id : null;
    const nextCardId = index >= 0 && index < siblings.length - 1 ? siblings[index + 1].id : null;

    // Autres effets/prismes existant déjà pour ce même numéro (même collection) — alimente
    // le menu déroulant "Effet / Prisme" sur la fiche carte.
    const variants = await prisma.card.findMany({
      where: { collectionId: card.collectionId, numero: card.numero },
      select: { id: true, rarete: true },
      orderBy: { rarete: "asc" },
    });

    // Chez les membres : combien possèdent / recherchent cette carte.
    const [owners, seekers] = await Promise.all([
      prisma.userCard.count({ where: { cardId: card.id, status: "owned" } }),
      prisma.userCard.count({ where: { cardId: card.id, status: "wanted" } }),
    ]);

    // Contributeur du scan : "contributeur" garde le pseudo du membre dont le scan a été
    // validé (ou un nom libre saisi par l'admin). Quand c'est un membre, on le relie à son
    // profil avec ses scans validés et ses points de contribution.
    let contributorProfile = null;
    if (card.contributeur) {
      const member = await prisma.user.findUnique({
        where: { username: card.contributeur.toLowerCase() },
        select: { id: true, username: true, avatar: true },
      });
      if (member) {
        const [approvedScans, approvedCollections] = await Promise.all([
          prisma.cardSubmission.count({ where: { userId: member.id, status: "approved" } }),
          prisma.collectionSubmission.count({ where: { userId: member.id, status: "approved" } }),
        ]);
        contributorProfile = {
          username: member.username,
          avatar: member.avatar,
          approvedScans,
          contributionPoints: contributionPointsOf(approvedScans, approvedCollections),
        };
      }
    }

    return NextResponse.json({
      ...card,
      prevCardId,
      nextCardId,
      variants,
      community: { owners, seekers },
      contributorProfile,
    });
  } catch (e) {
    console.error("Erreur GET /api/cards/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // On ne retraduit que si la description a réellement changé.
    const existing = await prisma.card.findUnique({ where: { id }, select: { description: true } });
    const descriptionChanged = (body.description || null) !== (existing?.description || null);
    const translations = descriptionChanged ? await translateFreeText(body.description) : null;
    const secondaires = Array.isArray(body.personnagesSecondaires) ? body.personnagesSecondaires.filter(Boolean) : [];

    const card = await prisma.card.update({
      where: { id },
      data: {
        numero: body.numero,
        personnagePrincipalId: body.personnagePrincipalId || null,
        rarete: body.rarete || "Commune",
        description: body.description || null,
        image: body.image || undefined,
        imageHD: body.imageHD || null,
        dos: body.dos !== undefined ? body.dos || null : undefined,
        dosHD: body.dosHD || null,
        contributeur: body.contributeur || null,
        collectionId: body.collectionId,
        personnagesSecondaires: {
          deleteMany: {},
          create: secondaires.map((characterId) => ({ characterId })),
        },
        ...(descriptionChanged
          ? {
              descriptionEn: translations.en,
              descriptionZhTW: translations.zhTW,
              descriptionZhCN: translations.zhCN,
            }
          : {}),
      },
      include: cardInclude,
    });
    return NextResponse.json(card);
  } catch (e) {
    console.error("Erreur PUT /api/cards/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const deleted = await prisma.card.delete({ where: { id } });
    await cleanupCardFiles([deleted]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/cards/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
