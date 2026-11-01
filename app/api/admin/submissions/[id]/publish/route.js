import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Mise en ligne d'un scan déjà validé (membre crédité) : soit la version retouchée par
// l'admin (image envoyée au préalable via l'upload admin), soit le scan du membre tel quel.
// Le pseudo du membre apparaît alors sur la carte comme contributeur.
const isStorageUrl = (u) => typeof u === "string" && u.startsWith("https://") && u.length < 600;

export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.image !== undefined && !isStorageUrl(body.image)) return NextResponse.json({ error: "Image invalide." }, { status: 400 });
    const submission = await prisma.cardSubmission.findUnique({ where: { id }, include: { user: { select: { username: true } } } });
    if (!submission) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (submission.status !== "approved" || !submission.cardId) return NextResponse.json({ error: "Valide d'abord la réception de ce scan." }, { status: 409 });
    if (submission.publishedAt) return NextResponse.json({ error: "Ce scan est déjà en ligne." }, { status: 409 });
    const reworked = body.image !== undefined;
    await prisma.card.update({
      where: { id: submission.cardId },
      data: {
        image: reworked ? body.image : submission.image,
        imageHD: reworked ? (isStorageUrl(body.imageHD) ? body.imageHD : null) : submission.imageHD || null,
        contributeur: submission.user.username,
      },
    });
    await prisma.cardSubmission.update({ where: { id }, data: { publishedAt: new Date() } });
    return NextResponse.json({ ok: true, cardId: submission.cardId });
  } catch (e) {
    console.error("Erreur POST /api/admin/submissions/[id]/publish :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
