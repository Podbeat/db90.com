import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { checkUserRateLimit } from "@/lib/rateLimit";
import { allowEmail } from "@/lib/emailLimits";
import { FOR_TRADE_WHERE } from "@/lib/cardStatus";
import {
  MAX_TRADE_CARDS,
  OPEN_TRADE_STATUSES,
  TRADE_INCLUDE,
  eitherBlocked,
  notifyTrade,
  traderStats,
  tradeView,
} from "@/lib/trades";

const DAY = 24 * 60 * 60 * 1000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

// Les échanges du membre connecté : en cours (proposés ou acceptés) et terminés (reçus des
// deux côtés, refusés ou annulés), avec pour chaque partenaire ses avis positifs et son
// nombre d'échanges terminés.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const me = session.sub;

    const trades = await prisma.trade.findMany({
      where: { OR: [{ proposerId: me }, { recipientId: me }] },
      include: TRADE_INCLUDE,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    const views = trades.map((t) => tradeView(t, me));
    const stats = await traderStats(views.map((v) => v.partner.id));
    const withStats = views.map((v) => ({ ...v, partnerStats: stats.get(v.partner.id) }));

    return NextResponse.json({
      active: withStats.filter((v) => OPEN_TRADE_STATUSES.includes(v.status)),
      done: withStats.filter((v) => !OPEN_TRADE_STATUSES.includes(v.status)),
    });
  } catch (e) {
    console.error("Erreur GET /api/trades :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

function cardIdList(value) {
  if (!Array.isArray(value)) return null;
  if (value.some((id) => typeof id !== "string" || id.length === 0 || id.length > 64)) return null;
  const unique = [...new Set(value)];
  return unique.length === value.length ? unique : null;
}

// Proposer un échange. Corps : { recipient: "pseudo", give: [cardId], receive: [cardId],
// message? }. Seules les cartes mises « À l'échange » comptent, de chaque côté ; une seule
// proposition en attente à la fois entre deux membres.
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const me = session.sub;

    const body = await request.json().catch(() => null);
    const give = cardIdList(body?.give);
    const receive = cardIdList(body?.receive);
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (!give || !receive || give.length === 0 || receive.length === 0) {
      return NextResponse.json({ error: "Choisissez au moins une carte à donner et une à recevoir." }, { status: 400 });
    }
    if (give.length > MAX_TRADE_CARDS || receive.length > MAX_TRADE_CARDS) {
      return NextResponse.json({ error: `${MAX_TRADE_CARDS} cartes au maximum de chaque côté.` }, { status: 400 });
    }

    const recipient = await prisma.user.findUnique({
      where: { username: String(body?.recipient || "").toLowerCase() },
      select: { id: true, username: true, email: true },
    });
    if (!recipient) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    if (recipient.id === me) return NextResponse.json({ error: "Vous ne pouvez pas échanger avec vous-même." }, { status: 400 });
    if (await eitherBlocked(me, recipient.id)) {
      return NextResponse.json({ error: "Échange impossible avec ce membre." }, { status: 403 });
    }

    const pending = await prisma.trade.findFirst({
      where: {
        status: "proposed",
        OR: [
          { proposerId: me, recipientId: recipient.id },
          { proposerId: recipient.id, recipientId: me },
        ],
      },
      select: { id: true },
    });
    if (pending) {
      return NextResponse.json({ error: "Une proposition est déjà en attente avec ce membre.", tradeId: pending.id }, { status: 409 });
    }

    const [iOwn, theyOwn] = await Promise.all([
      prisma.userCard.count({ where: { userId: me, ...FOR_TRADE_WHERE, cardId: { in: give } } }),
      prisma.userCard.count({ where: { userId: recipient.id, ...FOR_TRADE_WHERE, cardId: { in: receive } } }),
    ]);
    if (iOwn !== give.length || theyOwn !== receive.length) {
      return NextResponse.json({ error: "Les collections ont changé entre-temps : rechargez la page." }, { status: 409 });
    }

    if (!(await checkUserRateLimit(me, "trade-propose", { maxAttempts: 20, windowMs: DAY }))) {
      return NextResponse.json({ error: "Trop de propositions aujourd'hui, réessayez demain." }, { status: 429 });
    }

    const trade = await prisma.trade.create({
      data: {
        proposerId: me,
        recipientId: recipient.id,
        message: message || null,
        items: {
          create: [
            ...give.map((cardId) => ({ cardId, fromProposer: true })),
            ...receive.map((cardId) => ({ cardId, fromProposer: false })),
          ],
        },
      },
      select: { id: true },
    });
    await notifyTrade(recipient.id, trade.id, "trade_proposed");

    // E-mail de courtoisie (plafonné par membre, lib/emailLimits.js) : la proposition est
    // déjà enregistrée, un échec d'envoi ne change rien.
    const user = process.env.CONTACT_EMAIL_USER;
    const appPassword = process.env.CONTACT_EMAIL_APP_PASSWORD;
    if (user && appPassword && (await allowEmail(me, "tradeProposal"))) {
      try {
        const proposer = await prisma.user.findUnique({ where: { id: me }, select: { username: true } });
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass: appPassword } });
        await transporter.sendMail({
          from: `"DB Non-Off 90's" <${user}>`,
          to: recipient.email,
          subject: `[DB Non-Off 90's] ${proposer.username} vous propose un échange`,
          text:
            `${proposer.username} vous propose un échange sur DB Non-Off 90's : ` +
            `${receive.length} de vos cartes contre ${give.length} des siennes.\n\n` +
            `Pour l'accepter ou le refuser : ${SITE_URL}/compte/echanges/${trade.id}`,
        });
      } catch (mailError) {
        console.error("Erreur d'envoi de l'e-mail de proposition d'échange :", mailError);
      }
    }

    return NextResponse.json({ id: trade.id }, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/trades :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
