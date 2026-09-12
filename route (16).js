import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/userAuth";
import { requireAdmin } from "@/lib/auth";

export async function POST(request) {
  try {
    // Connecté via son compte utilisateur normal : on exige le mot de passe actuel, comme
    // d'habitude. Connecté uniquement via la session admin (compte lié, mot de passe côté
    // utilisateur encore inconnu ou jamais défini) : l'authentification admin déjà passée
    // fait foi, pas besoin de redemander un mot de passe que la personne ne connaît pas.
    const userSession = await requireUser(request);
    let userId = userSession?.sub;
    let viaAdmin = false;

    if (!userId) {
      const adminSession = await requireAdmin(request);
      if (!adminSession?.email) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
      const linkedUser = await prisma.user.findUnique({ where: { email: adminSession.email }, select: { id: true } });
      if (!linkedUser) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
      userId = linkedUser.id;
      viaAdmin = true;
    }

    const { currentPassword, newPassword } = await request.json();
    if (!newPassword) {
      return NextResponse.json({ error: "Champ manquant." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

    if (!viaAdmin) {
      if (!currentPassword) return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/me/password :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
