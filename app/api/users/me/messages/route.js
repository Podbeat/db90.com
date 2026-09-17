import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Liste des fils de discussion de l'utilisateur connecté : un par membre avec qui il a
// échangé au moins un message, trié par date du dernier message. Pas de table de
// "conversation" séparée — on regroupe simplement les messages envoyés/reçus par l'autre
// membre impliqué.
//
// "Masquer" un fil (HiddenThread) ne supprime rien : un fil masqué redevient visible dans
// la messagerie directe dès qu'un message plus récent que le masquage existe — pas besoin
// de nettoyer la ligne HiddenThread à ce moment-là, la comparaison de dates suffit ici.
// ?archived=1 renvoie l'inverse : uniquement les fils actuellement masqués (l'onglet
// "Archivées"), pour qu'on puisse les retrouver sans qu'ils polluent la boîte principale.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const wantArchived = searchParams.get("archived") === "1";

    const [messages, hidden] = await Promise.all([
      prisma.message.findMany({
        where: { OR: [{ senderId: session.sub }, { recipientId: session.sub }] },
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { username: true, avatar: true } },
          recipient: { select: { username: true, avatar: true } },
        },
      }),
      prisma.hiddenThread.findMany({ where: { userId: session.sub } }),
    ]);
    const hiddenAtByOtherId = new Map(hidden.map((h) => [h.otherId, h.hiddenAt]));

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

    const result = [...threads.entries()]
      .filter(([otherId, th]) => {
        const hiddenAt = hiddenAtByOtherId.get(otherId);
        const isArchived = hiddenAt && new Date(hiddenAt) >= new Date(th.lastAt);
        return wantArchived ? isArchived : !isArchived;
      })
      .map(([, th]) => th)
      .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

    return NextResponse.json(result);
  } catch (e) {
    console.error("Erreur GET /api/users/me/messages :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
