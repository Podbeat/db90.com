import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyActionToken } from "@/lib/userAuth";

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();
    if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères." }, { status: 400 });
    }

    const payload = await verifyActionToken(token, "password-reset");
    if (!payload?.sub) {
      return NextResponse.json({ error: "Ce lien a expiré ou n'est plus valide. Refaites une demande." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/reset-password :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
