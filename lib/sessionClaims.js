// Toutes les sessions du site sont signées avec le même AUTH_SECRET : une signature valide
// prouve seulement qu'un jeton vient du site, pas de quel type il est. Chaque type de
// session porte donc sa propre « audience » (champ aud du jeton), contrôlée à la lecture.
// Sans ce contrôle, une session membre recopiée dans le cookie admin ouvrait tout
// l'espace d'administration.
//
// Module sans dépendance, partagé par lib/auth.js, lib/userAuth.js et middleware.js
// (ce dernier s'exécute dans l'environnement Edge de Vercel).

const ADMIN_AUDIENCE = "db90:admin";
const USER_AUDIENCE = "db90:user";
const JWT_ALGORITHMS = ["HS256"];

// Session ouverte par /api/auth/login, et rien d'autre : audience et rôle admin, identifiant
// de compte, et jamais un jeton d'action (lien de réinitialisation, vérification d'e-mail).
function isAdminSessionPayload(payload) {
  return Boolean(
    payload &&
      payload.aud === ADMIN_AUDIENCE &&
      payload.role === "admin" &&
      typeof payload.sub === "string" &&
      payload.sub.length > 0 &&
      !payload.purpose
  );
}

// Session membre (connexion ou inscription). Les sessions ouvertes avant l'ajout de
// l'audience n'en ont pas : elles restent valables jusqu'à leur expiration (30 jours au
// plus), pour ne déconnecter aucun membre. Une session admin ou un jeton d'action n'est
// jamais accepté comme session membre.
function isUserSessionPayload(payload) {
  if (!payload || typeof payload.sub !== "string" || payload.sub.length === 0) return false;
  if (payload.purpose || payload.role) return false;
  return payload.aud === undefined || payload.aud === USER_AUDIENCE;
}

module.exports = { ADMIN_AUDIENCE, USER_AUDIENCE, JWT_ALGORITHMS, isAdminSessionPayload, isUserSessionPayload };
