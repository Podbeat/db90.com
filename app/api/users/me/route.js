import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, username: true, email: true, avatar: true, bio: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

    const [ownedCount, wantedCount] = await Promise.all([
      prisma.userCard.count({ where: { userId: user.id, status: "owned" } }),
      prisma.userCard.count({ where: { userId: user.id, status: "wanted" } }),
    ]);

    return NextResponse.json({ ...user, ownedCount, wantedCount });
  } catch (e) {
    console.error("Erreur GET /api/users/me :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const body = await request.json();
    const data = {};

    if (body.bio !== undefined) data.bio = body.bio ? body.bio.slice(0, 280) : null;
    if (body.avatar !== undefined) data.avatar = body.avatar || null;

    if (body.username !== undefined) {
      const username = body.username.trim().toLowerCase();
      if (!USERNAME_RE.test(username)) {
        return NextResponse.json(
          { error: "Le nom d'utilisateur doit faire 3 à 20 caractères (lettres minuscules, chiffres, - ou _)." },
          { status: 400 }
        );
      }
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: session.sub } } });
      if (existing) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 409 });
      data.username = username;
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: session.sub } } });
      if (existing) return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });
      data.email = email;
    }

    const user = await prisma.user.update({
      where: { id: session.sub },
      data,
      select: { id: true, username: true, email: true, avatar: true, bio: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error("Erreur PUT /api/users/me :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
