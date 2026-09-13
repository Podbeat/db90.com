import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const total = await prisma.card.count();
    if (total === 0) return NextResponse.json({ error: "Aucune carte." }, { status: 404 });

    const skip = Math.floor(Math.random() * total);
    const [card] = await prisma.card.findMany({ select: { id: true }, skip, take: 1 });

    return NextResponse.json({ id: card.id });
  } catch (e) {
    console.error("Erreur GET /api/cards/random :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
