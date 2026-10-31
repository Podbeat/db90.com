const sharp = require("sharp");

// Images des PDF (checklist de collection, cartes possédées, cartes recherchées).
//
// Les scans stockés font 900 px de large (300 Ko en moyenne). Insérés tels quels dans une
// grille de vignettes de 4 cm, une checklist de 60 cartes pesait 19 Mo. Chaque scan est donc
// réduit à la taille utile avant insertion : 260 px pour une vignette de 113 points, soit
// environ 165 dpi à l'impression, largement assez pour cocher une liste.
//
// Sortie toujours en JPEG : pdf-lib l'insère directement, y compris pour un scan d'origine
// PNG (qui, inséré comme JPEG, échouait et laissait un cadre vide).
const PDF_THUMB_WIDTH = 260;
const PDF_BACK_WIDTH = 120; // dos de la collection, affiché en 34 points dans l'en-tête

async function fetchPdfImage(url, { width = PDF_THUMB_WIDTH, quality = 72 } = {}) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    return await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    return null;
  }
}

// Comme Promise.all(items.map(fn)), mais au plus `limit` traitements à la fois : une
// collection de 200 cartes ne lance pas 200 téléchargements et décodages d'images en
// parallèle dans une seule fonction.
async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Télécharge, réduit et insère les vignettes de cartes dans le PDF. Renvoie, dans l'ordre
// des cartes, l'image insérée ou null (scan absent ou illisible : cadre vide à la place).
async function embedCardThumbs(pdfDoc, cards) {
  const buffers = await mapWithLimit(cards, 8, (c) => fetchPdfImage(c.image));
  const images = [];
  for (const bytes of buffers) {
    if (!bytes) {
      images.push(null);
      continue;
    }
    try {
      images.push(await pdfDoc.embedJpg(bytes));
    } catch (e) {
      images.push(null);
    }
  }
  return images;
}

module.exports = { PDF_THUMB_WIDTH, PDF_BACK_WIDTH, fetchPdfImage, mapWithLimit, embedCardThumbs };
