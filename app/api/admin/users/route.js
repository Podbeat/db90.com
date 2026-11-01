import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        emailVerified: true,
        _count: { select: { cards: true, listings: true, submissions: true, reportsReceived: true, ratingsReceived: true, messagesSent: true } },
      },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("Erreur GET /api/admin/users :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
