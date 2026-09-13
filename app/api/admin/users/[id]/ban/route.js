import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Bannir = mémoriser l'e-mail (pour bloquer connexion et réinscription) PUIS supprimer le
// compte correspondant. Un compte banni ne peut donc jamais rester actif après coup.
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

    await prisma.bannedEmail.upsert({
      where: { email: user.email },
      update: {},
      create: { email: user.email, reason: body.reason || null },
    });
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/users/[id]/ban :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
