import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        card: {
          select: { id: true, numero: true, image: true, personnagePrincipal: { select: { name: true } }, collection: { select: { nom: true } } },
        },
      },
    });
    const unreadCount = await prisma.notification.count({ where: { userId: session.sub, read: false } });

    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error("Erreur GET /api/users/me/notifications :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
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
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
