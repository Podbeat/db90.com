import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Endpoint volontairement permissif et silencieux : un échec de tracking ne doit
// jamais gêner la navigation du visiteur. Pas d'IP stockée — le pays vient de
// l'en-tête de géolocalisation fourni par Vercel (x-vercel-ip-country), qui
// n'expose jamais l'adresse elle-même.
export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type === "hd_download" ? "hd_download" : "page_view";
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 100) : null;
    const country = request.headers.get("x-vercel-ip-country") || null;

    await prisma.analyticsEvent.create({
      data: { type, path, country, visitorId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    // On avale l'erreur : le tracking ne doit jamais faire planter la page.
    return NextResponse.json({ ok: false });
  }
}
