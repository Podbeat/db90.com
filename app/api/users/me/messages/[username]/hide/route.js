import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Masque le fil avec ce membre (POST) ou le désarchive manuellement (DELETE) — sans jamais
// toucher aux messages eux-mêmes, qui restent en base pour l'autre personne et pour la
// vérification "message échangé au préalable" exigée par les avis entre membres.
async function resolveOther(username) {
  return prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
}

export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const other = await resolveOther(username);
    if (!other) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

    await prisma.hiddenThread.upsert({
      where: { userId_otherId: { userId: session.sub, otherId: other.id } },
      update: { hiddenAt: new Date() },
      create: { userId: session.sub, otherId: other.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur POST /api/users/me/messages/[username]/hide :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { username } = await params;
    const other = await resolveOther(username);
    if (!other) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

    await prisma.hiddenThread.deleteMany({ where: { userId: session.sub, otherId: other.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erreur DELETE /api/users/me/messages/[username]/hide :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
