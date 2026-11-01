import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { checkAndAwardBadges } from "@/lib/badgeNotifications";

// Valider une proposition. Deux cas possibles :
// - cardId renseigné : applique l'image sur la carte concernée (recto uniquement).
// - cardId vide : crée une TOUTE NOUVELLE carte à partir des collectionId/numero/rarete
//   proposés. Le personnage vient soit du choix explicite de l'utilisateur
//   (personnagePrincipalId, cas d'une carte non répertoriée dans une collection en cours),
//   soit à défaut d'une carte sœur existante (cas d'un nouvel effet pour un numéro connu).
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    // publish : true (par défaut) met le scan en ligne tout de suite ; false valide seulement
    // la réception : le membre est crédité, le visuel sera publié après retouche
    // (voir ../publish).
    const body = await request.json().catch(() => ({}));
    const publish = body?.publish !== false;
    const submission = await prisma.cardSubmission.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (submission.status === "approved") return NextResponse.json({ error: "Déjà validé." }, { status: 409 });

    let resultingCardId = submission.cardId;

    if (submission.cardId && publish) {
      await prisma.card.update({
        where: { id: submission.cardId },
        data: {
          image: submission.image,
          imageHD: submission.imageHD || null,
          contributeur: submission.user.username,
        },
      });
    } else if (!submission.cardId) {
      let personnagePrincipalId = submission.personnagePrincipalId;
      if (!personnagePrincipalId) {
        const sibling = await prisma.card.findFirst({
          where: { collectionId: submission.collectionId, numero: submission.numero },
          select: { personnagePrincipalId: true },
        });
        personnagePrincipalId = sibling?.personnagePrincipalId || null;
      }
      const created = await prisma.card.create({
        data: {
          collectionId: submission.collectionId,
          numero: submission.numero,
          rarete: submission.rarete || null,
          personnagePrincipalId,
          // Réception seule : la carte existe déjà dans le catalogue, son visuel viendra
          // à la publication.
          image: publish ? submission.image : null,
          imageHD: publish ? submission.imageHD || null : null,
          contributeur: publish ? submission.user.username : null,
        },
      });
      resultingCardId = created.id;
    }

    await prisma.cardSubmission.update({
      where: { id },
      data: { status: "approved", reviewedAt: new Date(), publishedAt: publish ? new Date() : null, cardId: resultingCardId },
    });

    await prisma.activityEvent.create({
      data: { type: "scan_approved", userId: submission.userId, cardId: resultingCardId },
    });

    await checkAndAwardBadges(submission.userId);

    return NextResponse.json({ ok: true, cardId: resultingCardId, published: publish });
  } catch (e) {
    console.error("Erreur POST /api/admin/submissions/[id]/approve :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
