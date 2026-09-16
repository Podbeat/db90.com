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
    const submission = await prisma.cardSubmission.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    let resultingCardId = submission.cardId;

    if (submission.cardId) {
      await prisma.card.update({
        where: { id: submission.cardId },
        data: {
          image: submission.image,
          imageHD: submission.imageHD || null,
          contributeur: submission.user.username,
        },
      });
    } else {
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
          rarete: submission.rarete || "Commune",
          personnagePrincipalId,
          image: submission.image,
          imageHD: submission.imageHD || null,
          contributeur: submission.user.username,
        },
      });
      resultingCardId = created.id;
    }

    await prisma.cardSubmission.update({
      where: { id },
      data: { status: "approved", reviewedAt: new Date() },
    });

    await prisma.activityEvent.create({
      data: { type: "scan_approved", userId: submission.userId, cardId: resultingCardId },
    });

    await checkAndAwardBadges(submission.userId);

    return NextResponse.json({ ok: true, cardId: resultingCardId });
  } catch (e) {
    console.error("Erreur POST /api/admin/submissions/[id]/approve :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
