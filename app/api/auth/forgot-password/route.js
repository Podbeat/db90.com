import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { signActionToken } from "@/lib/userAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { ADMIN_RESET_PURPOSE, ADMIN_RESET_EXPIRY, passwordFingerprint } from "@/lib/adminReset";

// Mot de passe admin oublié : envoie un lien de réinitialisation à l'adresse du compte admin.
// Répond toujours la même chose, que l'adresse soit celle de l'admin ou non, pour ne jamais
// révéler quelle adresse donne accès à l'administration.
export async function POST(request) {
  try {
    // Limite très basse : un vrai administrateur n'a besoin que d'un ou deux envois.
    const allowed = await checkRateLimit(request, "admin-forgot-password", {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) return rateLimitResponse(NextResponse);

    const { email } = await request.json();
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) return NextResponse.json({ error: "Adresse e-mail manquante." }, { status: 400 });

    const admin = await prisma.adminUser.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true, nom: true, email: true, passwordHash: true },
    });

    if (admin) {
      const gmailUser = process.env.CONTACT_EMAIL_USER;
      const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
      if (gmailUser && appPassword) {
        const token = await signActionToken(
          { sub: admin.id, fp: passwordFingerprint(admin.passwordHash) },
          ADMIN_RESET_PURPOSE,
          ADMIN_RESET_EXPIRY
        );
        const link = `${process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org"}/admin/reinitialiser-mot-de-passe?token=${token}`;
        try {
          const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: appPassword } });
          await transporter.sendMail({
            from: `"DB Non-Off 90's" <${gmailUser}>`,
            to: admin.email,
            subject: "[DB Non-Off 90's] Réinitialisation du mot de passe administrateur",
            text:
              `Bonjour ${admin.nom},\n\n` +
              `Une réinitialisation du mot de passe de l'espace d'administration a été demandée.\n\n` +
              `Lien (valable 15 minutes, utilisable une seule fois) :\n${link}\n\n` +
              `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.`,
          });
        } catch (mailError) {
          console.error("Erreur d'envoi de l'e-mail de réinitialisation admin :", mailError);
        }
      } else {
        console.error("Réinitialisation admin impossible : CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD manquants.");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/auth/forgot-password :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
