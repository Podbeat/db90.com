import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Envoie un e-mail via le compte Gmail configuré côté serveur (jamais exposé au client).
// Variables requises dans .env : CONTACT_EMAIL_USER, CONTACT_EMAIL_APP_PASSWORD
// (un "mot de passe d'application" Gmail, pas le mot de passe habituel du compte).

export async function POST(request) {
  const { subject, message, replyTo } = await request.json();

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Message manquant." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  }

  const user = process.env.CONTACT_EMAIL_USER;
  const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    console.error("CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD manquants dans .env");
    return NextResponse.json({ error: "Envoi indisponible pour le moment." }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: appPassword },
    });

    await transporter.sendMail({
      from: `"DB Non-Off 90's — Site" <${user}>`,
      to: user,
      replyTo: replyTo && replyTo.trim() ? replyTo.trim() : undefined,
      subject: subject && subject.trim() ? `[Site] ${subject.trim()}` : "[Site] Nouveau message",
      text: message.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur envoi e-mail:", e.message);
    return NextResponse.json({ error: "Échec de l'envoi." }, { status: 500 });
  }
}
