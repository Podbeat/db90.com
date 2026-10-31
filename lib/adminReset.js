const crypto = require("crypto");

// Réinitialisation du mot de passe admin — plus stricte que celle des membres, puisque
// ce compte donne accès à tout le site :
//  - lien valable 15 minutes seulement (30 pour les membres) ;
//  - "purpose" propre ("admin-password-reset"), donc un lien membre ne peut jamais
//    servir côté admin, et inversement ;
//  - lien à usage unique : le jeton embarque une empreinte du hachage actuel du mot de
//    passe. Dès que le mot de passe change, l'empreinte ne correspond plus et tous les
//    liens déjà envoyés deviennent inutilisables, sans table ni colonne supplémentaire.
const ADMIN_RESET_PURPOSE = "admin-password-reset";
const ADMIN_RESET_EXPIRY = "15m";

function passwordFingerprint(passwordHash) {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 32);
}

function fingerprintMatches(passwordHash, fingerprint) {
  if (typeof fingerprint !== "string") return false;
  const expected = Buffer.from(passwordFingerprint(passwordHash));
  const received = Buffer.from(fingerprint);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = { ADMIN_RESET_PURPOSE, ADMIN_RESET_EXPIRY, passwordFingerprint, fingerprintMatches };
