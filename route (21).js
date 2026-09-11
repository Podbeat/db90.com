import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET : liste des signalements (admin uniquement)
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const reports = await prisma.report.findMany({
      where: status && status !== "all" ? { status } : {},
      include: { card: { include: { collection: { select: { nom: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reports);
  } catch (e) {
    console.error("Erreur GET /api/reports :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// POST : signalement public — n'importe quel visiteur peut signaler une erreur sur une carte.
export async function POST(request) {
  try {
    const body = await request.json();
    const { cardId, message, contact } = body;

    if (!cardId || !message || !message.trim()) {
      return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: "Message trop long." }, { status: 400 });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    }

    const report = await prisma.report.create({
      data: {
        cardId,
        message: message.trim().slice(0, 1000),
        contact: contact ? String(contact).trim().slice(0, 200) : null,
      },
    });
    return NextResponse.json({ ok: true, id: report.id }, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/reports :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
