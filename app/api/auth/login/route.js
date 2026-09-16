import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signSession, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(request) {
  try {
    // Compte admin = accès total au site : limite la plus stricte de toutes les routes.
    const allowed = await checkRateLimit(request, "admin-login", {
      maxAttempts: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) return rateLimitResponse(NextResponse);

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants manquants." }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    const token = await signSession({ sub: user.id, email: user.email, nom: user.nom, role: user.role });

    const response = NextResponse.json({ ok: true, nom: user.nom });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (e) {
    console.error("Erreur POST /api/auth/login :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
