const { SignJWT, jwtVerify } = require("jose");

// Cookie distinct de celui de l'admin (archives_session) : un visiteur peut être connecté
// à son compte public sans jamais avoir accès à l'admin, et inversement.
const COOKIE_NAME = "user_session";
const SESSION_DURATION = "30d";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET manquant. Définissez une chaîne aléatoire longue dans votre fichier .env (voir .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

async function signUserSession(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

async function verifyUserSession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch (e) {
    return null;
  }
}

async function requireUser(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyUserSession(token);
}

// Jetons à usage unique et courte durée de vie (réinitialisation de mot de passe,
// vérification d'e-mail) — distincts des sessions de connexion (30 jours). Le champ
// "purpose" évite qu'un jeton de vérification d'e-mail puisse être réutilisé pour
// réinitialiser un mot de passe, même s'il n'a pas encore expiré.
async function signActionToken(payload, purpose, expiresIn) {
  return await new SignJWT({ ...payload, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

async function verifyActionToken(token, expectedPurpose) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== expectedPurpose) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = { COOKIE_NAME, signUserSession, verifyUserSession, requireUser, signActionToken, verifyActionToken };
