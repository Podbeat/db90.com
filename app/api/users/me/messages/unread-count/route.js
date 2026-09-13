import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ count: 0 });

    const count = await prisma.message.count({ where: { recipientId: session.sub, read: false } });
    return NextResponse.json({ count });
  } catch (e) {
    console.error("Erreur GET /api/users/me/messages/unread-count :", e);
    return NextResponse.json({ count: 0 });
  }
}
