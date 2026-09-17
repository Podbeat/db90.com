import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Blocage d'un membre, limité à la messagerie pour l'instant : empêche l'envoi de messages
// dans les deux sens tant que le blocage existe (voir POST /api/users/me/messages/[username]).
// Ne masque pas les annonces/le catalogue de la personne bloquée.

export async function GET(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ blockedByMe: false, hasBlockedMe: false });

    const { username } = await params;
    const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

    const [blockedByMe, hasBlockedMe] = await Promise.all([
      prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId: session.sub, blockedId: target.id } } }),
      prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId: target.id, blockedId: session.sub } } }),
    ]);

    return NextResponse.json({ blockedByMe: !!blockedByMe, hasBlockedMe: !!hasBlockedMe });
  } catch (e) {
    console.error("Erreur GET /api/users/[username]/block :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    if (target.id === session.sub) return NextResponse.json({ error: "Action impossible sur vous-même." }, { status: 400 });

    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: session.sub, blockedId: target.id } },
      update: {},
      create: { blockerId: session.sub, blockedId: target.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/[username]/block :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

    await prisma.blockedUser.deleteMany({ where: { blockerId: session.sub, blockedId: target.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/users/[username]/block :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
