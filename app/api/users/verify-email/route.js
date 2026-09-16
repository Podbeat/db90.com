import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyActionToken } from "@/lib/userAuth";

export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });

    const payload = await verifyActionToken(token, "email-verify");
    if (!payload?.sub) {
      return NextResponse.json({ error: "Ce lien a expiré ou n'est plus valide." }, { status: 400 });
    }

    await prisma.user.update({ where: { id: payload.sub }, data: { emailVerified: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/verify-email :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
