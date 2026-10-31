// Choisit la traduction adaptée à la langue active pour un champ traduit
// automatiquement (ex. description d'une carte ou d'une collection), avec repli
// sur le texte français d'origine si la traduction est absente ou pas encore générée.
export function localize(obj, baseField, lang) {
  if (!obj) return null;
  if (lang === "en") return obj[`${baseField}En`] || obj[baseField] || null;
  if (lang === "zh") return obj[`${baseField}ZhTW`] || obj[baseField] || null;
  if (lang === "zh-CN") return obj[`${baseField}ZhCN`] || obj[baseField] || null;
  return obj[baseField] || null;
}

// Date courte au format de la langue active (12/10/2026, 2026/10/12…).
const DATE_LOCALES = { fr: "fr-FR", en: "en-GB", zh: "zh-TW", "zh-CN": "zh-CN" };

export function formatDate(date, lang) {
  if (!date) return "";
  return new Date(date).toLocaleDateString(DATE_LOCALES[lang] || "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Montant arrondi à l'euro, avec les séparateurs de la langue active (« 1 250 € »). Le
// signe € suit le nombre, comme partout ailleurs sur le site.
export function formatEuros(amount, lang) {
  return `${new Intl.NumberFormat(DATE_LOCALES[lang] || "fr-FR", { maximumFractionDigits: 0 }).format(Math.round(amount))} €`;
}
