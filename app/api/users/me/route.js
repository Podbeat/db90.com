import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { signActionToken } from "@/lib/userAuth";

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, username: true, email: true, avatar: true, bio: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

    const [ownedCount, wantedCount] = await Promise.all([
      prisma.userCard.count({ where: { userId: user.id, status: "owned" } }),
      prisma.userCard.count({ where: { userId: user.id, status: "wanted" } }),
    ]);

    return NextResponse.json({ ...user, ownedCount, wantedCount });
  } catch (e) {
    console.error("Erreur GET /api/users/me :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const body = await request.json();
    const data = {};

    if (body.bio !== undefined) data.bio = body.bio ? body.bio.slice(0, 280) : null;
    if (body.avatar !== undefined) data.avatar = body.avatar || null;

    if (body.username !== undefined) {
      const username = body.username.trim().toLowerCase();
      if (!USERNAME_RE.test(username)) {
        return NextResponse.json(
          { error: "Le nom d'utilisateur doit faire 3 à 20 caractères (lettres minuscules, chiffres, - ou _)." },
          { status: 400 }
        );
      }
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: session.sub } } });
      if (existing) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 409 });
      data.username = username;
    }

    let emailChanged = false;
    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: session.sub } } });
      if (existing) return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });

      const current = await prisma.user.findUnique({ where: { id: session.sub }, select: { email: true, username: true } });
      emailChanged = current.email !== email;
      data.email = email;
      // Une nouvelle adresse doit être reconfirmée avant qu'on lui fasse à nouveau
      // confiance — sans ça, une faute de frappe resterait invisible jusqu'au premier
      // e-mail qui échoue réellement (voir l'incident avec un domaine inexistant).
      if (emailChanged) {
        data.emailVerified = false;
        const gmailUser = process.env.CONTACT_EMAIL_USER;
        const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
        if (gmailUser && appPassword) {
          try {
            const verifyToken = await signActionToken({ sub: session.sub }, "email-verify", "7d");
            const link = `${process.env.NEXT_PUBLIC_SITE_URL || "https://db90-com.vercel.app"}/compte/verifier-email?token=${verifyToken}`;
            const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: appPassword } });
            await transporter.sendMail({
              from: `"DB Non-Off 90's" <${gmailUser}>`,
              to: email,
              subject: "[DB Non-Off 90's] Confirmez votre nouvelle adresse e-mail",
              text: `Bonjour ${current.username},\n\nConfirmez votre nouvelle adresse e-mail en cliquant sur ce lien :\n${link}`,
            });
          } catch (mailError) {
            console.error("Erreur d'envoi de l'e-mail de vérification :", mailError);
          }
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: session.sub },
      data,
      select: { id: true, username: true, email: true, avatar: true, bio: true, emailVerified: true },
    });
    return NextResponse.json({ ...user, verificationResent: emailChanged });
  } catch (e) {
    console.error("Erreur PUT /api/users/me :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
