import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { deleteObjects } from "@/lib/storage";

async function loadOwnedCard(submissionId, cardId, userId) {
  const submission = await prisma.collectionSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.userId !== userId) return { submission: null, card: null };
  if (submission.status === "approved" || submission.status === "rejected") return { submission, card: null };
  const card = await prisma.collectionSubmissionCard.findFirst({ where: { id: cardId, submissionId } });
  return { submission, card };
}

// Modifie la référence/le personnage/l'effet d'une carte déjà ajoutée (pas son image —
// pour changer le visuel, retirez-la et rajoutez-la).
export async function PUT(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id, cardId } = await params;
    const { card } = await loadOwnedCard(id, cardId, session.sub);
    if (!card) return NextResponse.json({ error: "Introuvable ou non modifiable." }, { status: 404 });

    const body = await request.json();
    const numero = (body.numero || "").trim();
    if (!numero) return NextResponse.json({ error: "La référence est obligatoire." }, { status: 400 });

    const updated = await prisma.collectionSubmissionCard.update({
      where: { id: cardId },
      data: {
        numero,
        rarete: body.rarete || "Commune",
        personnagePrincipalId: body.personnagePrincipalId || null,
      },
      include: { personnagePrincipal: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Erreur PUT /api/collection-submissions/[id]/cards/[cardId] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id, cardId } = await params;
    const { card } = await loadOwnedCard(id, cardId, session.sub);
    if (!card) return NextResponse.json({ error: "Introuvable ou non modifiable." }, { status: 404 });

    await prisma.collectionSubmissionCard.delete({ where: { id: cardId } });
    await deleteObjects([card.image].filter(Boolean));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/collection-submissions/[id]/cards/[cardId] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
