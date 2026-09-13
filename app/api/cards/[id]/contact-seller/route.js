import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Envoie un message à un vendeur par e-mail, sans jamais exposer l'adresse de l'un ou
// l'autre à l'interface : l'e-mail part du compte Gmail du site, adressé au vendeur, avec
// le "répondre à" positionné sur l'adresse de l'acheteur pour qu'ils puissent échanger
// directement ensuite.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id: cardId } = await params;
    const { sellerUserId, message } = await request.json();

    if (!message?.trim()) return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    if (message.length > 3000) return NextResponse.json({ error: "Message trop long." }, { status: 400 });
    if (!sellerUserId) return NextResponse.json({ error: "Vendeur manquant." }, { status: 400 });

    const [buyer, seller, card] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, email: true } }),
      prisma.user.findUnique({ where: { id: sellerUserId }, select: { username: true, email: true } }),
      prisma.card.findUnique({
        where: { id: cardId },
        include: { personnagePrincipal: true, collection: { select: { nom: true } } },
      }),
    ]);
    if (!seller) return NextResponse.json({ error: "Vendeur introuvable." }, { status: 404 });
    if (!card) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

    if (sellerUserId === session.sub) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous contacter vous-même." }, { status: 400 });
    }

    const user = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (!user || !appPassword) {
      console.error("CONTACT_EMAIL_USER / CONTACT_EMAIL_APP_PASSWORD manquants dans .env");
      return NextResponse.json({ error: "Envoi indisponible pour le moment." }, { status: 500 });
    }

    const cardName = card.personnagePrincipal?.name || card.numero;
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass: appPassword } });

    await transporter.sendMail({
      from: `"DB Non-Off 90's" <${user}>`,
      to: seller.email,
      replyTo: buyer.email,
      subject: `[DB Non-Off 90's] ${buyer.username} vous contacte à propos de "${cardName}" (${card.numero})`,
      text: `${buyer.username} (${buyer.email}) vous contacte au sujet de votre annonce pour la carte "${cardName}" — ${card.numero}, ${card.collection.nom} :\n\n${message.trim()}\n\nVous pouvez répondre directement à cet e-mail.`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/cards/[id]/contact-seller :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
