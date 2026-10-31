import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    // Renvoie aussi le nombre de messages non lus : la cloche et l'icône des messages de
    // l'en-tête n'ont ainsi besoin que d'un seul appel (lib/useMemberActivity.js).
    const [notifications, unreadCount, unreadMessages] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          card: {
            select: { id: true, numero: true, image: true, personnagePrincipal: { select: { name: true } }, collection: { select: { nom: true } } },
          },
          trade: { select: { proposerId: true, proposer: { select: { username: true } }, recipient: { select: { username: true } } } },
        },
      }),
      prisma.notification.count({ where: { userId: session.sub, read: false } }),
      prisma.message.count({ where: { recipientId: session.sub, read: false } }),
    ]);

    // Notifications d'échange : seul le pseudo de l'autre membre est renvoyé (`actor`).
    const items = notifications.map(({ trade, ...n }) => ({
      ...n,
      actor: trade ? (trade.proposerId === session.sub ? trade.recipient.username : trade.proposer.username) : null,
    }));

    return NextResponse.json({ notifications: items, unreadCount, unreadMessages });
  } catch (e) {
    console.error("Erreur GET /api/users/me/notifications :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Marque toutes les notifications de l'utilisateur connecté comme lues (appelé à
// l'ouverture du panneau de notifications).
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    await prisma.notification.updateMany({
      where: { userId: session.sub, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/me/notifications :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
