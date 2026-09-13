import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Liste des fils de discussion de l'utilisateur connecté : un par membre avec qui il a
// échangé au moins un message, trié par date du dernier message. Pas de table de
// "conversation" séparée — on regroupe simplement les messages envoyés/reçus par l'autre
// membre impliqué.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: session.sub }, { recipientId: session.sub }] },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { username: true, avatar: true } },
        recipient: { select: { username: true, avatar: true } },
      },
    });

    const threads = new Map();
    for (const m of messages) {
      const isMine = m.senderId === session.sub;
      const other = isMine ? m.recipient : m.sender;
      const otherId = isMine ? m.recipientId : m.senderId;
      if (!threads.has(otherId)) {
        threads.set(otherId, {
          username: other.username,
          avatar: other.avatar,
          lastMessage: m.body,
          lastAt: m.createdAt,
          unread: 0,
        });
      }
      if (!isMine && !m.read) threads.get(otherId).unread += 1;
    }

    return NextResponse.json([...threads.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)));
  } catch (e) {
    console.error("Erreur GET /api/users/me/messages :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
