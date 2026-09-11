// Fait correspondre un nom de pays (tel que saisi librement dans l'admin, en français ou
// anglais) à son drapeau emoji. Insensible à la casse et aux accents. Retourne un globe
// générique si le pays n'est pas reconnu, plutôt que de ne rien afficher.
// Drapeaux dessinés en SVG (pas des emojis) : contrairement aux emojis, certains drapeaux
// comme Hong Kong ne s'affichent pas correctement sous Windows (la police système ne les
// a pas et montre les deux lettres du pays à la place). En dessinant nous-mêmes ces 7
// drapeaux, le rendu est identique sur toutes les plateformes.
function svgDataUri(svg) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const FLAG_SVGS = {
  "hong kong": svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><rect width='30' height='20' fill='#DE2910'/><g fill='#fff'><circle cx='15' cy='10' r='1.6'/><ellipse cx='15' cy='6.2' rx='2' ry='3.4' transform='rotate(0 15 10)'/><ellipse cx='15' cy='6.2' rx='2' ry='3.4' transform='rotate(72 15 10)'/><ellipse cx='15' cy='6.2' rx='2' ry='3.4' transform='rotate(144 15 10)'/><ellipse cx='15' cy='6.2' rx='2' ry='3.4' transform='rotate(216 15 10)'/><ellipse cx='15' cy='6.2' rx='2' ry='3.4' transform='rotate(288 15 10)'/></g></svg>"
  ),
  taiwan: svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><rect width='30' height='20' fill='#FE0000'/><rect width='15' height='10' fill='#000095'/><circle cx='7.5' cy='5' r='3' fill='#fff'/></svg>"
  ),
  "chine continentale": svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><rect width='30' height='20' fill='#DE2910'/><g fill='#FFDE00'><polygon points='5,2 5.8,4.2 8.2,4.2 6.3,5.6 7,7.8 5,6.4 3,7.8 3.7,5.6 1.8,4.2 4.2,4.2'/><circle cx='9' cy='1.5' r='0.6'/><circle cx='10' cy='3.5' r='0.6'/><circle cx='10' cy='6' r='0.6'/><circle cx='9' cy='8' r='0.6'/></g></svg>"
  ),
  malaisie: svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><rect width='30' height='20' fill='#fff'/><g fill='#CC0001'><rect y='0' width='30' height='1.43'/><rect y='2.86' width='30' height='1.43'/><rect y='5.71' width='30' height='1.43'/><rect y='8.57' width='30' height='1.43'/><rect y='11.43' width='30' height='1.43'/><rect y='14.29' width='30' height='1.43'/><rect y='17.14' width='30' height='1.43'/></g><rect width='15' height='11.4' fill='#010066'/><circle cx='6' cy='5.7' r='3.2' fill='#FFCC00'/><circle cx='7.2' cy='5.7' r='2.7' fill='#010066'/><polygon points='9,5.7 12,4.3 10.8,5.7 12,7.1' fill='#FFCC00'/></svg>"
  ),
  thailande: svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><rect width='30' height='20' fill='#fff'/><rect y='0' width='30' height='3.33' fill='#A51931'/><rect y='3.33' width='30' height='3.33' fill='#fff'/><rect y='6.67' width='30' height='6.67' fill='#2D2A4A'/><rect y='13.33' width='30' height='3.33' fill='#fff'/><rect y='16.67' width='30' height='3.33' fill='#A51931'/></svg>"
  ),
  france: svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><rect width='10' height='20' fill='#0055A4'/><rect x='10' width='10' height='20' fill='#fff'/><rect x='20' width='10' height='20' fill='#EF4135'/></svg>"
  ),
  inconnue: svgDataUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><circle cx='15' cy='10' r='9' fill='none' stroke='#8ea3c4' stroke-width='1.4'/><ellipse cx='15' cy='10' rx='4' ry='9' fill='none' stroke='#8ea3c4' stroke-width='1.1'/><line x1='6' y1='10' x2='24' y2='10' stroke='#8ea3c4' stroke-width='1.1'/><line x1='7.3' y1='5.5' x2='22.7' y2='5.5' stroke='#8ea3c4' stroke-width='1'/><line x1='7.3' y1='14.5' x2='22.7' y2='14.5' stroke='#8ea3c4' stroke-width='1'/></svg>"
  ),
};

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .trim();
}

export function getFlagSvg(country) {
  const key = normalize(country);
  return FLAG_SVGS[key] || FLAG_SVGS["inconnue"];
}
