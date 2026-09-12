import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// Envoie un e-mail à tous les comptes inscrits, en une fois par lot (en copie cachée, pour
// que personne ne voie l'adresse des autres). Réutilise le même compte Gmail que le
// formulaire de contact (CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD dans .env).
const BATCH_SIZE = 80;

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { subject, message } = await request.json();
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Sujet et message requis." }, { status: 400 });
    }

    const user = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (!user || !appPassword) {
      return NextResponse.json({ error: "Envoi indisponible : CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD non configurés." }, { status: 500 });
    }

    const users = await prisma.user.findMany({ select: { email: true } });
    const emails = users.map((u) => u.email);
    if (emails.length === 0) {
      return NextResponse.json({ error: "Aucun compte inscrit pour l'instant." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: appPassword },
    });

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      await transporter.sendMail({
        from: `"DB Non-Off 90's" <${user}>`,
        to: user,
        bcc: batch,
        subject: subject.trim(),
        text: message.trim(),
      });
    }

    return NextResponse.json({ ok: true, count: emails.length });
  } catch (e) {
    console.error("Erreur POST /api/admin/users/broadcast :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
