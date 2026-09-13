import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteObjects } from "@/lib/storage";

// Refuser une proposition : le fichier envoyé ne servira jamais, on le supprime donc du
// stockage tout de suite (contrairement à la suppression d'une carte, aucune vérification
// de partage n'est nécessaire ici — chaque envoi a un nom de fichier unique et n'est
// jamais assigné à une carte tant qu'il n'est pas approuvé).
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const submission = await prisma.cardSubmission.findUnique({ where: { id } });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    await prisma.cardSubmission.update({
      where: { id },
      data: { status: "rejected", reviewedAt: new Date() },
    });

    await deleteObjects([submission.image, submission.imageHD].filter(Boolean));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/submissions/[id]/reject :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
