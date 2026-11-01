import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicCacheHeaders } from "@/lib/httpCache";

// Liste publique des effets / prismes, pour les menus déroulants des formulaires d'envoi.
export async function GET(request) {
  try {
    const effects = await prisma.effect.findMany({ select: { name: true } });
    const sorted = effects.map((e) => e.name).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    return NextResponse.json(sorted.map((name) => ({ name })), { headers: publicCacheHeaders(request) });
  } catch (e) {
    console.error("Erreur GET /api/effects :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
