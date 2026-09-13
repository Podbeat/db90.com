import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Contact générique d'un membre depuis son profil public (pas lié à une carte précise,
// contrairement à /api/cards/[id]/contact-seller). Même principe : e-mail envoyé par le
// compte Gmail du site, jamais d'adresse exposée à l'interface, "répondre à" pointé sur
// l'expéditeur pour que la conversation continue directement par e-mail ensuite.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const { message } = await request.json();

    if (!message?.trim()) return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    if (message.length > 3000) return NextResponse.json({ error: "Message trop long." }, { status: 400 });

    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, email: true } }),
      prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, username: true, email: true } }),
    ]);
    if (!recipient) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    if (recipient.id === session.sub) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous contacter vous-même." }, { status: 400 });
    }

    const user = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (!user || !appPassword) {
      console.error("CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD manquants dans .env");
      return NextResponse.json({ error: "Envoi indisponible pour le moment." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass: appPassword } });

    await transporter.sendMail({
      from: `"DB Non-Off 90's" <${user}>`,
      to: recipient.email,
      replyTo: sender.email,
      subject: `[DB Non-Off 90's] ${sender.username} vous a envoyé un message`,
      text: `${sender.username} (${sender.email}) vous contacte via votre profil DB Non-Off 90's :\n\n${message.trim()}\n\nVous pouvez répondre directement à cet e-mail.`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/[username]/contact :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
