// Tri "naturel" : compare les références comme un humain le ferait (4 < 10 < 16),
// plutôt que comme du texte brut (10 < 16 < 4), tout en restant compatible avec des
// références mixtes du type "ZCB-01". S'appuie sur le support natif du navigateur/Node.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function naturalSortByNumero(a, b) {
  return collator.compare(a.numero || "", b.numero || "");
}

module.exports = { naturalSortByNumero };
