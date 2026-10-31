const crypto = require("crypto");
const { prisma } = require("./db");

// Récupère l'IP du visiteur uniquement pour la hacher aussitôt (voir plus bas) : elle n'est
// jamais conservée en clair, dans la même logique que AnalyticsEvent qui ne stocke que le
// pays déduit par Vercel et jamais l'IP elle-même.
function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// "routeName" sert de sel : la même IP produit une clé différente sur deux routes, donc
// deux compteurs de débit indépendants, et impossible de relier deux hachages entre eux
// pour reconstituer une IP.
function hashKey(routeName, ip) {
  return crypto.createHash("sha256").update(`${routeName}:${ip}`).digest("hex");
}

/**
 * Vérifie et enregistre une tentative pour (routeName, IP appelante).
 * Renvoie true si la tentative est autorisée, false si la limite est atteinte.
 *
 * @param {Request} request
 * @param {string} routeName - identifiant court et fixe de la route (ex. "admin-login")
 * @param {{ maxAttempts: number, windowMs: number }} options
 */
async function checkRateLimit(request, routeName, options) {
  return consumeAttempt(hashKey(routeName, getClientIp(request)), options);
}

/**
 * Même principe, compté par membre connecté plutôt que par IP : sert à plafonner ce qu'un
 * membre peut déclencher (e-mails surtout, le quota Gmail du site étant de 500 destinataires
 * par jour), quel que soit le réseau depuis lequel il se connecte.
 *
 * @param {string} userId - identifiant du membre (session.sub)
 * @param {string} routeName - identifiant court et fixe du compteur (ex. "message-email")
 * @param {{ maxAttempts: number, windowMs: number }} options
 */
async function checkUserRateLimit(userId, routeName, options) {
  return consumeAttempt(hashKey(routeName, `user:${userId}`), options);
}

async function consumeAttempt(key, { maxAttempts, windowMs }) {
  const since = new Date(Date.now() - windowMs);

  // Nettoyage à la volée des tentatives expirées pour cette clé : la table ne grossit
  // jamais durablement, pas besoin de tâche planifiée séparée pour la vider.
  await prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: since } } });

  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= maxAttempts) return false;

  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}

// Réponse standard à renvoyer quand checkRateLimit() renvoie false.
function rateLimitResponse(NextResponse) {
  return NextResponse.json(
    { error: "Trop de tentatives. Merci de réessayer dans quelques minutes." },
    { status: 429 }
  );
}

module.exports = { checkRateLimit, checkUserRateLimit, rateLimitResponse, getClientIp };
