import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    const { message } = await request.json();
    if (!message?.trim()) return NextResponse.json({ error: "Message manquant." }, { status: 400 });

    await prisma.userReport.create({
      data: { reportedUserId: target.id, reporterUserId: session.sub, message: message.trim() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/[username]/report :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
