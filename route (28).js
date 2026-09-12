import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90-com.vercel.app";

const BODY_BG = rgb(0.961, 0.945, 0.910);
const HEADER_BG = rgb(0.071, 0.125, 0.227);
const HEADER_LINE = rgb(0.165, 0.235, 0.369);
const HEADER_TEXT = rgb(0.933, 0.949, 0.980);
const HEADER_MUTED = rgb(0.557, 0.639, 0.769);
const INK = rgb(0.051, 0.082, 0.149);
const MUTED = rgb(0.478, 0.443, 0.361);
const ACCENT = rgb(0.949, 0.443, 0.109); // #f2711c
const GOLD = rgb(0.878, 0.690, 0.290); // #e0b04a

// pdf-lib + StandardFonts (WinAnsi) ne savent pas afficher tous les caractères Unicode :
// on retire les accents et on remplace le reste (CJK, emoji...) par "?", comme pour le
// checklist de collection — cette fiche PDF reste donc en version simplifiée d'affichage,
// pas une traduction complète du site.
function safe(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "?");
}

// Découpe un texte en lignes tenant dans `maxWidth`, pour un rendu pdf-lib qui ne sait pas
// faire de retour à la ligne automatique.
function wrapText(text, font, size, maxWidth) {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function fetchImageBytes(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    return null;
  }
}

export async function GET(request, { params }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { collection: true },
  });

  if (!card) {
    return new Response("Introuvable.", { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (e) {
    logoImage = null;
  }

  const rectoUrl = card.image;
  const versoUrl = card.dos || card.collection.dos;
  const [rectoBytes, versoBytes] = await Promise.all([fetchImageBytes(rectoUrl), fetchImageBytes(versoUrl)]);

  let rectoImage = null;
  if (rectoBytes) {
    try { rectoImage = await pdfDoc.embedJpg(rectoBytes); } catch (e) { rectoImage = null; }
  }
  let versoImage = null;
  if (versoBytes) {
    try { versoImage = await pdfDoc.embedJpg(versoBytes); } catch (e) { versoImage = null; }
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 50;
  const headerH = 95;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: BODY_BG });
  page.drawRectangle({ x: 0, y: pageHeight - headerH, width: pageWidth, height: headerH, color: HEADER_BG });
  page.drawLine({ start: { x: 0, y: pageHeight - headerH }, end: { x: pageWidth, y: pageHeight - headerH }, thickness: 0.6, color: HEADER_LINE });
  page.drawRectangle({ x: 0, y: pageHeight - headerH - 3, width: pageWidth, height: 3, color: ACCENT });
  page.drawRectangle({ x: 0, y: pageHeight - headerH - 1, width: pageWidth, height: 1, color: rgb(1, 0.95, 0.8) });

  // Bloc gauche : logo + tagline du site (identique au checklist de collection)
  const logoH = 26;
  let hy = pageHeight - 26;
  if (logoImage) {
    const logoW = (logoImage.width / logoImage.height) * logoH;
    page.drawImage(logoImage, { x: marginX, y: hy - logoH, width: logoW, height: logoH });
  }
  hy -= logoH + 10;
  page.drawText("Archive de reference des cartes", { x: marginX, y: hy, size: 7.5, font, color: ACCENT });
  hy -= 10;
  page.drawText("Dragon Ball non-officielles des annees 90", { x: marginX, y: hy, size: 7.5, font, color: ACCENT });

  // Case à droite : collection + référence de la carte
  const boxX = pageWidth / 2 - 10;
  const boxW = pageWidth - marginX - boxX;
  const boxY = pageHeight - headerH + 14;
  const boxH = headerH - 28;
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderColor: GOLD, borderWidth: 0.8 });

  const textX = boxX + 10;
  let ty = boxY + boxH - 16;
  page.drawText(safe(card.collection.nom), { x: textX, y: ty, size: 11, font: fontBold, color: HEADER_TEXT });
  ty -= 14;
  const metaLine = [card.collection.pays, card.collection.annee].filter(Boolean).join(" - ");
  if (metaLine) {
    page.drawText(safe(metaLine), { x: textX, y: ty, size: 8, font, color: HEADER_MUTED });
    ty -= 11;
  }
  page.drawText(`Reference ${safe(card.numero)}`, { x: textX, y: ty, size: 8, font, color: HEADER_MUTED });

  // Visuels recto / verso, côte à côte
  let y = pageHeight - headerH - 30;
  const imgW = 210;
  const imgH = imgW * 1.4; // ratio 5:7
  const gap = 30;
  const totalImgW = versoImage ? imgW * 2 + gap : imgW;
  const startX = (pageWidth - totalImgW) / 2;

  if (rectoImage) {
    page.drawImage(rectoImage, { x: startX, y: y - imgH, width: imgW, height: imgH });
  } else {
    page.drawRectangle({ x: startX, y: y - imgH, width: imgW, height: imgH, borderColor: MUTED, borderWidth: 0.6 });
  }
  page.drawText("Recto", { x: startX, y: y - imgH - 14, size: 8, font: fontItalic, color: MUTED });

  if (versoImage) {
    const versoX = startX + imgW + gap;
    page.drawImage(versoImage, { x: versoX, y: y - imgH, width: imgW, height: imgH });
    page.drawText("Verso", { x: versoX, y: y - imgH - 14, size: 8, font: fontItalic, color: MUTED });
  }

  y = y - imgH - 40;

  // Bloc d'informations
  page.drawText(safe(card.personnage), { x: marginX, y, size: 20, font: fontBold, color: INK });
  y -= 24;

  const infoLines = [];
  if (card.rarete) infoLines.push(["Effet / Prisme", card.rarete]);
  if (card.contributeur) infoLines.push(["Scan fourni par", card.contributeur]);

  for (const [label, value] of infoLines) {
    page.drawText(`${label} :`, { x: marginX, y, size: 9.5, font: fontBold, color: MUTED });
    page.drawText(safe(value), { x: marginX + 110, y, size: 9.5, font, color: INK });
    y -= 16;
  }

  if (card.description) {
    y -= 6;
    const lines = wrapText(card.description, font, 9.5, pageWidth - marginX * 2);
    for (const line of lines) {
      page.drawText(line, { x: marginX, y, size: 9.5, font, color: INK });
      y -= 13;
    }
  }

  // Pied de page
  const dateStr = new Date().toLocaleDateString("fr-FR");
  page.drawText(
    `Fiche generee le ${dateStr} - DB Non-Off 90's - ${SITE_URL}/cartes/${card.id}`,
    { x: marginX, y: 34, size: 7, font, color: MUTED }
  );

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carte-${safe(card.numero).replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
