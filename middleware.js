import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "archives_session";
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/mot-de-passe-oublie", "/admin/reinitialiser-mot-de-passe"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Pages accessibles sans être connecté : connexion et mot de passe oublié.
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch (e) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
