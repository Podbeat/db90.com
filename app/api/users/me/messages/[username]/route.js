import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Fil complet des messages avec un membre donné, dans les deux sens. Marque au passage les
// messages reçus de cette personne comme lus (on vient de les afficher).
export async function GET(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const other = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, avatar: true },
    });
    if (!other) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.sub, recipientId: other.id },
          { senderId: other.id, recipientId: session.sub },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.updateMany({
      where: { senderId: other.id, recipientId: session.sub, read: false },
      data: { read: true },
    });

    return NextResponse.json({ other, messages });
  } catch (e) {
    console.error("Erreur GET /api/users/me/messages/[username] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Envoie un message à ce membre. Contrairement à l'ancien relais par e-mail, la
// conversation reste sur le site — on envoie juste un e-mail de courtoisie pour prévenir
// le destinataire, sans jamais exposer l'adresse de l'un ou l'autre ni de bouton "répondre"
// direct : la réponse se fait sur le site, dans l'historique.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const { body } = await request.json();
    if (!body?.trim()) return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    if (body.length > 3000) return NextResponse.json({ error: "Message trop long." }, { status: 400 });

    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.sub }, select: { username: true } }),
      prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true, email: true } }),
    ]);
    if (!recipient) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    if (recipient.id === session.sub) return NextResponse.json({ error: "Vous ne pouvez pas vous écrire à vous-même." }, { status: 400 });

    const message = await prisma.message.create({
      data: { senderId: session.sub, recipientId: recipient.id, body: body.trim() },
    });

    const user = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (user && appPassword) {
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass: appPassword } });
        await transporter.sendMail({
          from: `"DB Non-Off 90's" <${user}>`,
          to: recipient.email,
          subject: `[DB Non-Off 90's] Nouveau message de ${sender.username}`,
          text: `${sender.username} vous a envoyé un message sur DB Non-Off 90's. Connectez-vous pour le lire et y répondre : ${process.env.NEXT_PUBLIC_SITE_URL || ""}/compte/messages/${sender.username}`,
        });
      } catch (mailError) {
        // La notification par e-mail est un confort, pas une garantie : le message est déjà
        // enregistré, on ne fait pas échouer l'envoi pour autant.
        console.error("Erreur d'envoi de la notification par e-mail :", mailError);
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/users/me/messages/[username] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
