import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const banned = await prisma.bannedEmail.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(banned);
  } catch (e) {
    console.error("Erreur GET /api/admin/banned-emails :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Ban manuel direct par e-mail (sans passer par un compte existant), pour empêcher
// préventivement une inscription future.
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { email, reason } = await request.json();
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) return NextResponse.json({ error: "E-mail manquant." }, { status: 400 });

    await prisma.bannedEmail.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, reason: reason || null },
    });

    const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
    if (existingUser) await prisma.user.delete({ where: { id: existingUser.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/banned-emails :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
