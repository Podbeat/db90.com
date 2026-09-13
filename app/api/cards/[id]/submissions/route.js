import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { processDisplayImage } from "@/lib/storage";

export const runtime = "nodejs";

// Un utilisateur propose un scan pour une carte (typiquement une carte "recherchée"). Le
// fichier est traité exactement comme un import admin (redimensionnement, filigrane,
// compression), mais la carte n'est PAS modifiée tout de suite : la proposition reste en
// attente ("pending") jusqu'à validation par un admin depuis /admin/scans.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id: cardId } = await params;
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { display } = await processDisplayImage(buffer, file.name, { watermark: true });

    const submission = await prisma.cardSubmission.upsert({
      where: { cardId_userId: { cardId, userId: session.sub } },
      update: { image: display, status: "pending", reviewedAt: null },
      create: { cardId, userId: session.sub, image: display, status: "pending" },
    });

    return NextResponse.json({ ok: true, status: submission.status });
  } catch (e) {
    console.error("Erreur POST /api/cards/[id]/submissions :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Statut de la proposition de l'utilisateur connecté pour cette carte (aucune, en attente,
// acceptée, refusée) — utilisé pour afficher le bon état du formulaire sur la fiche carte.
export async function GET(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ status: null });

    const { id: cardId } = await params;
    const submission = await prisma.cardSubmission.findUnique({
      where: { cardId_userId: { cardId, userId: session.sub } },
      select: { status: true },
    });

    return NextResponse.json({ status: submission?.status || null });
  } catch (e) {
    console.error("Erreur GET /api/cards/[id]/submissions :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
