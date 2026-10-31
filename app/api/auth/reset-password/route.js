import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyActionToken } from "@/lib/userAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { ADMIN_RESET_PURPOSE, fingerprintMatches } from "@/lib/adminReset";

const INVALID_LINK = "Ce lien a expiré, a déjà été utilisé ou n'est pas valide. Refaites une demande.";

export async function POST(request) {
  try {
    const allowed = await checkRateLimit(request, "admin-reset-password", {
      maxAttempts: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) return rateLimitResponse(NextResponse);

    const { token, newPassword } = await request.json();
    if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
    if (!newPassword || newPassword.length < 12) {
      return NextResponse.json({ error: "Le mot de passe administrateur doit faire au moins 12 caractères." }, { status: 400 });
    }

    const payload = await verifyActionToken(token, ADMIN_RESET_PURPOSE);
    if (!payload?.sub) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    // Empreinte différente = le mot de passe a déjà changé depuis l'envoi du lien
    // (lien déjà utilisé, ou remplacé par une demande plus récente suivie d'une réinitialisation).
    if (!admin || !fingerprintMatches(admin.passwordHash, payload.fp)) {
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    // Mise à jour conditionnelle : si deux envois du même lien arrivent en même temps,
    // un seul peut aboutir.
    const { count } = await prisma.adminUser.updateMany({
      where: { id: admin.id, passwordHash: admin.passwordHash },
      data: { passwordHash },
    });
    if (count === 0) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/auth/reset-password :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
