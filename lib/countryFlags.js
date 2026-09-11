// Fait correspondre un nom de pays (tel que saisi librement dans l'admin, en français ou
// anglais) à son drapeau emoji. Insensible à la casse et aux accents. Retourne un globe
// générique si le pays n'est pas reconnu, plutôt que de ne rien afficher.
const FLAGS = {
  taiwan: "🇹🇼",
  "hong kong": "🇭🇰",
  hongkong: "🇭🇰",
  chine: "🇨🇳",
  china: "🇨🇳",
  "chine continentale": "🇨🇳",
  malaisie: "🇲🇾",
  malaysia: "🇲🇾",
  france: "🇫🇷",
  japon: "🇯🇵",
  japan: "🇯🇵",
  coree: "🇰🇷",
  "coree du sud": "🇰🇷",
  korea: "🇰🇷",
  thailande: "🇹🇭",
  thailand: "🇹🇭",
  singapour: "🇸🇬",
  singapore: "🇸🇬",
  vietnam: "🇻🇳",
  indonesie: "🇮🇩",
  indonesia: "🇮🇩",
  philippines: "🇵🇭",
  "etats-unis": "🇺🇸",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  bresil: "🇧🇷",
  brazil: "🇧🇷",
  mexique: "🇲🇽",
  mexico: "🇲🇽",
  italie: "🇮🇹",
  italy: "🇮🇹",
  espagne: "🇪🇸",
  spain: "🇪🇸",
};

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .trim();
}

export function getFlagEmoji(country) {
  if (!country) return null;
  return FLAGS[normalize(country)] || "🌏";
}
