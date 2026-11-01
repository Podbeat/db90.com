import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// E-mail de l'administration à un seul membre, depuis le même compte Gmail que l'envoi
// groupé (CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD).
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const { id } = await params;
    const { subject, message } = await request.json().catch(() => ({}));
    if (!subject?.trim() || !message?.trim()) return NextResponse.json({ error: "Sujet et message requis." }, { status: 400 });
    if (subject.length > 200 || message.length > 5000) return NextResponse.json({ error: "Message trop long." }, { status: 400 });
    const sender = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (!sender || !appPassword) return NextResponse.json({ error: "Envoi indisponible : compte d'envoi non configuré." }, { status: 500 });
    const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
    if (!user) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: sender, pass: appPassword } });
    await transporter.sendMail({
      from: `"DB Non-Off 90's" <${sender}>`,
      to: user.email,
      subject: subject.trim(),
      text: message.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/admin/users/[id]/email :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
