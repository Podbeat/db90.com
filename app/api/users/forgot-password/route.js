import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { signActionToken } from "@/lib/userAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Envoie un lien de réinitialisation par e-mail si l'adresse correspond à un compte.
// Répond toujours la même chose que l'adresse existe ou non, pour ne pas laisser deviner
// quelles adresses sont inscrites sur le site (énumération de comptes). La limite de débit
// ci-dessous porte sur l'IP appelante, pas sur l'adresse e-mail visée : elle ne réintroduit
// donc aucune fuite sur l'existence d'un compte.
export async function POST(request) {
  try {
    const allowed = await checkRateLimit(request, "forgot-password", {
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) return rateLimitResponse(NextResponse);

    const { email } = await request.json();
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) return NextResponse.json({ error: "Adresse e-mail manquante." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, username: true } });

    if (user) {
      const gmailUser = process.env.CONTACT_EMAIL_USER;
      const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
      if (gmailUser && appPassword) {
        const token = await signActionToken({ sub: user.id }, "password-reset", "30m");
        const link = `${process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org"}/compte/reinitialiser-mot-de-passe?token=${token}`;
        try {
          const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: appPassword } });
          await transporter.sendMail({
            from: `"DB Non-Off 90's" <${gmailUser}>`,
            to: normalized,
            subject: "[DB Non-Off 90's] Réinitialisation de votre mot de passe",
            text: `Bonjour ${user.username},\n\nVoici le lien pour réinitialiser votre mot de passe (valable 30 minutes) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.`,
          });
        } catch (mailError) {
          console.error("Erreur d'envoi de l'e-mail de réinitialisation :", mailError);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/forgot-password :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
