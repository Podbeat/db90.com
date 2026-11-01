// Scans originaux des membres (pleine définition, non recadrés), envoyés directement au
// stockage dans ce dossier. isOriginalUrl vérifie qu'une adresse reçue d'un navigateur
// désigne bien un fichier de ce dossier, sur le stockage du site.
const ORIGINALS_PREFIX = "originaux/";
const ORIGINAL_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ORIGINAL_MAX_BYTES = 40 * 1024 * 1024;

function isOriginalUrl(url) {
  const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
  if (!base || typeof url !== "string" || url.length > 600) return false;
  const prefix = `${base}/${ORIGINALS_PREFIX}`;
  return url.startsWith(prefix) && /^[\w.-]+$/.test(url.slice(prefix.length));
}

module.exports = { ORIGINALS_PREFIX, ORIGINAL_TYPES, ORIGINAL_MAX_BYTES, isOriginalUrl };
