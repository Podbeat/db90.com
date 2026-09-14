import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteObjects } from "@/lib/storage";

export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const submission = await prisma.collectionSubmission.findUnique({
      where: { id },
      include: { cards: true },
    });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    await prisma.collectionSubmission.update({
      where: { id },
      data: { status: "rejected", reviewedAt: new Date() },
    });

    await deleteObjects(submission.cards.map((c) => c.image).filter(Boolean));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/collection-submissions/[id]/reject :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
