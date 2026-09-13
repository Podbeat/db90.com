import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signUserSession, COOKIE_NAME } from "@/lib/userAuth";

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifiants manquants." }, { status: 400 });
    }

    const normalized = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: normalized }, { email: normalized }] },
    });
    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    const banned = await prisma.bannedEmail.findUnique({ where: { email: user.email } });
    if (banned) {
      return NextResponse.json({ error: "Ce compte n'est plus accessible." }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    const token = await signUserSession({ sub: user.id, username: user.username });
    const response = NextResponse.json({ ok: true, username: user.username });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (e) {
    console.error("Erreur POST /api/users/login :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
