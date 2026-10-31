import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { signActionToken } from "@/lib/userAuth";
import { allowEmail, EMAIL_LIMITS } from "@/lib/emailLimits";

export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, email: true, emailVerified: true } });
    if (!user) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const gmailUser = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (!gmailUser || !appPassword) {
      return NextResponse.json({ error: "Envoi indisponible pour le moment." }, { status: 500 });
    }

    // Plafond par membre (lib/emailLimits.js), pour protéger le quota Gmail du site.
    if (!(await allowEmail(session.sub, "verificationResend"))) {
      return NextResponse.json(
        { error: `Limite de ${EMAIL_LIMITS.verificationResend.maxAttempts} envois par heure atteinte. Vérifiez vos courriers indésirables, puis réessayez plus tard.` },
        { status: 429 }
      );
    }

    const verifyToken = await signActionToken({ sub: session.sub }, "email-verify", "7d");
    const link = `${process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org"}/compte/verifier-email?token=${verifyToken}`;
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: appPassword } });
    await transporter.sendMail({
      from: `"DB Non-Off 90's" <${gmailUser}>`,
      to: user.email,
      subject: "[DB Non-Off 90's] Confirmez votre adresse e-mail",
      text: `Bonjour ${user.username},\n\nConfirmez votre adresse e-mail en cliquant sur ce lien :\n${link}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/resend-verification :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
