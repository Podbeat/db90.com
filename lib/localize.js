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
