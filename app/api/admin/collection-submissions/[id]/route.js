import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const submission = await prisma.collectionSubmission.findUnique({
      where: { id },
      include: {
        user: { select: { username: true, avatar: true, email: true } },
        cards: { include: { personnagePrincipal: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    return NextResponse.json(submission);
  } catch (e) {
    console.error("Erreur GET /api/admin/collection-submissions/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
