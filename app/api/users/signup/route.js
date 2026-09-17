import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { signUserSession, signActionToken, COOKIE_NAME } from "@/lib/userAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const allowed = await checkRateLimit(request, "signup", {
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) return rateLimitResponse(NextResponse);

    const body = await request.json();
    const username = (body.username || "").trim().toLowerCase();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "Le nom d'utilisateur doit faire 3 à 20 caractères (lettres minuscules, chiffres, - ou _)." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 8 caractères." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true },
    });
    if (existing) {
      const field = existing.username === username ? "Ce nom d'utilisateur" : "Cette adresse e-mail";
      return NextResponse.json({ error: `${field} est déjà utilisé(e).` }, { status: 409 });
    }

    const banned = await prisma.bannedEmail.findUnique({ where: { email } });
    if (banned) {
      return NextResponse.json({ error: "Cette adresse e-mail ne peut pas être utilisée." }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
    });

    const gmailUser = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (gmailUser && appPassword) {
      try {
        const verifyToken = await signActionToken({ sub: user.id }, "email-verify", "7d");
        const link = `${process.env.NEXT_PUBLIC_SITE_URL || "https://db90-com.vercel.app"}/compte/verifier-email?token=${verifyToken}`;
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: appPassword } });
        await transporter.sendMail({
          from: `"DB Non-Off 90's" <${gmailUser}>`,
          to: email,
          subject: "[DB Non-Off 90's] Confirmez votre adresse e-mail",
          text: `Bienvenue ${username} !\n\nConfirmez votre adresse e-mail en cliquant sur ce lien :\n${link}\n\nSans cette confirmation, vous pourriez ne jamais recevoir les messages d'autres membres ou un e-mail de récupération de mot de passe.`,
        });
      } catch (mailError) {
        // L'inscription reste valide même si l'e-mail de vérification échoue à partir —
        // le membre pourra toujours en redemander un depuis son compte.
        console.error("Erreur d'envoi de l'e-mail de vérification :", mailError);
      }
    }

    const token = await signUserSession({ sub: user.id, username: user.username });
    const response = NextResponse.json({ ok: true, username: user.username });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (e) {
    console.error("Erreur POST /api/users/signup :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
