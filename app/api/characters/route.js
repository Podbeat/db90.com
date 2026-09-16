import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Liste complète des personnages, publique et en lecture seule — utilisée par le
// formulaire de proposition de collection (les membres n'ont pas accès aux routes admin).
export async function GET() {
  try {
    const characters = await prisma.character.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    return NextResponse.json(characters);
  } catch (e) {
    console.error("Erreur GET /api/characters :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
