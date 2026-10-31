const { SignJWT, jwtVerify } = require("jose");
const { ADMIN_AUDIENCE, JWT_ALGORITHMS, isAdminSessionPayload } = require("./sessionClaims");

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

// Session admin : marquée de l'audience admin, seule acceptée par requireAdmin et le
// middleware (voir lib/sessionClaims.js).
async function signSession(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

// Renvoie le contenu de la session admin, ou null si le jeton est absent, expiré, mal
// signé, ou d'un autre type (session membre, lien reçu par e-mail…).
async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      audience: ADMIN_AUDIENCE,
      algorithms: JWT_ALGORITHMS,
    });
    return isAdminSessionPayload(payload) ? payload : null;
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
