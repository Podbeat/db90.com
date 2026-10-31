const { checkUserRateLimit } = require("./rateLimit");

// Plafonds d'e-mails déclenchés par un membre. Le compte Gmail du site ne peut écrire qu'à
// 500 destinataires par 24 heures ; au-delà, plus rien ne part, pas même les e-mails de
// vérification ou de mot de passe oublié. Ces plafonds empêchent un seul membre (ou un
// compte malveillant) d'épuiser ce quota pour tout le monde. Valeurs ajustables ici.
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const EMAIL_LIMITS = {
  // Prévenir le destinataire d'un nouveau message privé. Ne compte que les e-mails
  // réellement envoyés : un seul par conversation tant que le précédent n'est pas lu.
  messageNotification: { name: "message-email", maxAttempts: 20, windowMs: DAY },
  // Contacter un vendeur (fiche carte) ou un membre (profil) par e-mail : compteur commun.
  memberContact: { name: "member-contact-email", maxAttempts: 10, windowMs: DAY },
  // Renvoyer l'e-mail de vérification de son adresse.
  verificationResend: { name: "resend-verification", maxAttempts: 3, windowMs: HOUR },
  // Changer d'adresse e-mail (un e-mail de vérification part vers la nouvelle adresse).
  emailChange: { name: "email-change", maxAttempts: 3, windowMs: DAY },
};

// Enregistre un envoi pour ce membre et renvoie true s'il reste sous le plafond.
async function allowEmail(userId, kind) {
  const limit = EMAIL_LIMITS[kind];
  return checkUserRateLimit(userId, limit.name, limit);
}

module.exports = { EMAIL_LIMITS, allowEmail };
