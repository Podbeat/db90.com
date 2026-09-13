import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Valider une proposition applique son image sur la carte concernée (recto uniquement —
// le scan proposé remplace le visuel "recherchée"), crédite le contributeur, et marque la
// proposition comme acceptée.
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

    await prisma.$transaction([
      prisma.card.update({
        where: { id: submission.cardId },
        data: {
          image: submission.image,
          imageHD: submission.imageHD || null,
          contributeur: submission.user.username,
        },
      }),
      prisma.cardSubmission.update({
        where: { id },
        data: { status: "approved", reviewedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/submissions/[id]/approve :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
