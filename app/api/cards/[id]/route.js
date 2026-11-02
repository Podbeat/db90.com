import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canonicalEffect, UNKNOWN_EFFECT_ERROR } from "@/lib/effects";
import { requireAdmin } from "@/lib/auth";
import { translateFreeText } from "@/lib/translate";
import { cleanupCardFiles } from "@/lib/cardFileCleanup";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { groupByNumero } from "@/lib/variants";
import { BACKS_SELECT } from "@/lib/collectionBacks";
import { contributionPointsOf } from "@/lib/participation";

const cardInclude = {
  collection: { include: { backs: BACKS_SELECT } },
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

    // Cartes de la collection regroupées par numéro (triées naturellement par référence) :
    // - précédente / suivante passent au numéro voisin (sa version principale), sans
    //   s'arrêter sur les autres prismes du même numéro ;
    // - `variants` liste toutes les versions de ce numéro (effets / prismes connus), avec leur
    //   visuel, pour la bande « Existe en N effets / prismes » de la fiche.
    const siblings = await prisma.card.findMany({
      where: { collectionId: card.collectionId },
      select: { id: true, numero: true, rarete: true, image: true, createdAt: true },
    });
    siblings.sort(naturalSortByNumero);
    const groups = groupByNumero(siblings);
    const index = groups.findIndex((g) => g.numero === card.numero);
    const prevCardId = index > 0 ? groups[index - 1].cards[0].id : null;
    const nextCardId = index >= 0 && index < groups.length - 1 ? groups[index + 1].cards[0].id : null;
    const variants = index >= 0 ? groups[index].cards.map(({ id, rarete, image }) => ({ id, rarete, image })) : [];

    // Chez les membres : combien possèdent / recherchent cette carte, et combien de ceux
    // qui la possèdent l'ont mise à l'échange.
    const [owners, seekers, traders] = await Promise.all([
      prisma.userCard.count({ where: { cardId: card.id, status: "owned" } }),
      prisma.userCard.count({ where: { cardId: card.id, status: "wanted" } }),
      prisma.userCard.count({ where: { cardId: card.id, status: "owned", forTrade: true } }),
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
      community: { owners, seekers, traders },
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
    // Effet choisi dans la liste gérée par l'administration ; vide = effet à définir.
    const rarete = await canonicalEffect(body.rarete);
    if (rarete === undefined) return NextResponse.json({ error: UNKNOWN_EFFECT_ERROR }, { status: 400 });

    const card = await prisma.card.update({
      where: { id },
      data: {
        numero: body.numero,
        personnagePrincipalId: body.personnagePrincipalId || null,
        rarete,
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
