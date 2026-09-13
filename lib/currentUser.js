const { requireAdmin } = require("./auth");
const { requireUser } = require("./userAuth");
const { prisma } = require("./db");

/**
 * Résout la session "utilisateur public" courante (avatar, collection, cartes
 * recherchées...), qu'elle vienne d'une connexion normale via /compte/connexion OU d'une
 * connexion admin via /admin/login — l'administrateur du site est aussi un utilisateur
 * normal comme un autre, avec le même profil public, sans avoir de mot de passe séparé à
 * retenir. Seul l'accès à /admin reste distinct et protégé par requireAdmin uniquement.
 *
 * Renvoie { sub, username } (même forme que requireUser) ou null si personne n'est
 * connecté d'une façon ou d'une autre.
 */
async function resolveUserSession(request) {
  const userSession = await requireUser(request);
  if (userSession) return userSession;

  const adminSession = await requireAdmin(request);
  if (adminSession?.email) {
    const user = await prisma.user.findUnique({
      where: { email: adminSession.email },
      select: { id: true, username: true },
    });
    if (user) return { sub: user.id, username: user.username };
  }

  return null;
}

module.exports = { resolveUserSession };
