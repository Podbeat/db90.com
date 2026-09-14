import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Fait passer une proposition de "draft" à "pending" — elle apparaît alors dans la file de
// l'admin, mais reste modifiable par son auteur jusqu'à ce qu'elle soit traitée.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id } = await params;
    const submission = await prisma.collectionSubmission.findUnique({
      where: { id },
      include: { _count: { select: { cards: true } } },
    });
    if (!submission || submission.userId !== session.sub) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    if (submission.status !== "draft") {
      return NextResponse.json({ error: "Cette proposition a déjà été soumise." }, { status: 400 });
    }
    if (submission._count.cards === 0) {
      return NextResponse.json({ error: "Ajoutez au moins une carte avant de soumettre." }, { status: 400 });
    }

    const updated = await prisma.collectionSubmission.update({
      where: { id },
      data: { status: "pending" },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Erreur POST /api/collection-submissions/[id]/submit :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
