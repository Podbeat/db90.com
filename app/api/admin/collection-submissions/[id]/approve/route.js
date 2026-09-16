import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { translateFreeText } from "@/lib/translate";

// Valider une proposition crée une vraie Collection et ses Card à partir des données
// proposées — le membre est crédité comme contributeur sur chaque carte. Les 100 points de
// participation sont automatiques : computeParticipation compte les propositions acceptées.
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const submission = await prisma.collectionSubmission.findUnique({
      where: { id },
      include: { user: { select: { username: true } }, cards: true },
    });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (submission.status === "approved") return NextResponse.json({ error: "Déjà acceptée." }, { status: 400 });
    if (submission.cards.length === 0) return NextResponse.json({ error: "Aucune carte dans cette proposition." }, { status: 400 });

    const translations = await translateFreeText(submission.description);

    const collection = await prisma.collection.create({
      data: {
        nom: submission.nom,
        annee: submission.annee,
        editeur: submission.editeur,
        pays: submission.pays,
        total: submission.total,
        description: submission.description,
        descriptionEn: translations.en,
        descriptionZhTW: translations.zhTW,
        descriptionZhCN: translations.zhCN,
        cards: {
          create: submission.cards.map((c) => ({
            numero: c.numero,
            rarete: c.rarete,
            personnagePrincipalId: c.personnagePrincipalId,
            image: c.image,
            contributeur: submission.user.username,
          })),
        },
      },
    });

    await prisma.collectionSubmission.update({
      where: { id },
      data: { status: "approved", reviewedAt: new Date(), resultingCollectionId: collection.id },
    });

    return NextResponse.json({ ok: true, collectionId: collection.id });
  } catch (e) {
    console.error("Erreur POST /api/admin/collection-submissions/[id]/approve :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
