import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { deleteObjects } from "@/lib/storage";

async function loadOwned(id, userId) {
  const submission = await prisma.collectionSubmission.findUnique({
    where: { id },
    include: { cards: { include: { personnagePrincipal: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!submission || submission.userId !== userId) return null;
  return submission;
}

export async function GET(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id } = await params;
    const submission = await loadOwned(id, session.sub);
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    return NextResponse.json(submission);
  } catch (e) {
    console.error("Erreur GET /api/collection-submissions/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Modifie les infos de la collection (pas les cartes, voir la sous-route dédiée) — possible
// tant que la proposition n'a pas encore été traitée par un admin.
export async function PUT(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id } = await params;
    const submission = await loadOwned(id, session.sub);
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (submission.status === "approved" || submission.status === "rejected") {
      return NextResponse.json({ error: "Cette proposition a déjà été traitée, elle n'est plus modifiable." }, { status: 400 });
    }

    const body = await request.json();
    const nom = (body.nom || "").trim();
    if (!nom) return NextResponse.json({ error: "Le nom de la collection est obligatoire." }, { status: 400 });

    const updated = await prisma.collectionSubmission.update({
      where: { id },
      data: {
        nom,
        annee: body.annee || null,
        editeur: body.editeur || null,
        pays: body.pays || null,
        total: body.total ? parseInt(body.total, 10) || null : null,
        description: body.description || null,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Erreur PUT /api/collection-submissions/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Supprime entièrement une proposition (et ses images) — bloqué une fois approuvée, pour
// ne jamais toucher à la vraie collection qui en a résulté.
export async function DELETE(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id } = await params;
    const submission = await loadOwned(id, session.sub);
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (submission.status === "approved") {
      return NextResponse.json({ error: "Une proposition déjà acceptée ne peut plus être supprimée." }, { status: 400 });
    }

    await deleteObjects(submission.cards.map((c) => c.image).filter(Boolean));
    await prisma.collectionSubmission.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/collection-submissions/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
