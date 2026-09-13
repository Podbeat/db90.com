const { SignJWT, jwtVerify } = require("jose");

const COOKIE_NAME = "archives_session";
const SESSION_DURATION = "7d";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET manquant. Définissez une chaîne aléatoire longue dans votre fichier .env (voir .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

async function signSession(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch (e) {
    return null;
  }
}

async function requireAdmin(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySession(token);
}

module.exports = { COOKIE_NAME, signSession, verifySession, requireAdmin };
