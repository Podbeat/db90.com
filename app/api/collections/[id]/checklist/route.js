import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

const BODY_BG = rgb(0.961, 0.945, 0.910);
const HEADER_BG = rgb(0.071, 0.125, 0.227);
const HEADER_LINE = rgb(0.165, 0.235, 0.369);
const HEADER_TEXT = rgb(0.933, 0.949, 0.980);
const HEADER_MUTED = rgb(0.557, 0.639, 0.769);
const INK = rgb(0.051, 0.082, 0.149);
const MUTED = rgb(0.478, 0.443, 0.361);
const ACCENT = rgb(0.949, 0.443, 0.109); // #f2711c
const GOLD = rgb(0.878, 0.690, 0.290); // #e0b04a

function safe(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "?");
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
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { cards: true },
  });

  if (!collection) {
    return new Response("Introuvable.", { status: 404 });
  }

  const cards = [...collection.cards].sort(naturalSortByNumero);

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

  const dosBytes = await fetchImageBytes(collection.dos);
  let dosImage = null;
  if (dosBytes) {
    try { dosImage = await pdfDoc.embedJpg(dosBytes); } catch (e) { dosImage = null; }
  }

  const thumbBytesList = await Promise.all(cards.map((c) => fetchImageBytes(c.image)));
  const thumbImages = [];
  for (let i = 0; i < cards.length; i++) {
    const bytes = thumbBytesList[i];
    if (!bytes) { thumbImages.push(null); continue; }
    try {
      thumbImages.push(await pdfDoc.embedJpg(bytes));
    } catch (e) {
      thumbImages.push(null);
    }
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 50;
  const headerH = 95;

  function drawIdentityBand(p) {
    p.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: BODY_BG });
    p.drawRectangle({ x: 0, y: pageHeight - headerH, width: pageWidth, height: headerH, color: HEADER_BG });
    p.drawLine({ start: { x: 0, y: pageHeight - headerH }, end: { x: pageWidth, y: pageHeight - headerH }, thickness: 0.6, color: HEADER_LINE });
    p.drawRectangle({ x: 0, y: pageHeight - headerH - 3, width: pageWidth, height: 3, color: ACCENT });
    p.drawRectangle({ x: 0, y: pageHeight - headerH - 1, width: pageWidth, height: 1, color: rgb(1, 0.95, 0.8) });

    // Bloc gauche : logo + tagline du site
    const logoH = 26;
    let hy = pageHeight - 26;
    if (logoImage) {
      const logoW = (logoImage.width / logoImage.height) * logoH;
      p.drawImage(logoImage, { x: marginX, y: hy - logoH, width: logoW, height: logoH });
    }
    hy -= logoH + 10;
    p.drawText("Archive de reference des cartes", { x: marginX, y: hy, size: 7.5, font, color: ACCENT });
    hy -= 10;
    p.drawText("Dragon Ball non-officielles des annees 90", { x: marginX, y: hy, size: 7.5, font, color: ACCENT });

    // Case à droite : dos + informations de la collection
    const boxX = pageWidth / 2 - 10;
    const boxW = pageWidth - marginX - boxX;
    const boxY = pageHeight - headerH + 14;
    const boxH = headerH - 28;
    p.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderColor: GOLD, borderWidth: 0.8 });

    let textX = boxX + 10;
    if (dosImage) {
      const dosW = 34, dosH = boxH - 14;
      const dosX = boxX + 10;
      const dosY = boxY + (boxH - dosH) / 2;
      p.drawImage(dosImage, { x: dosX, y: dosY, width: dosW, height: dosH });
      textX = dosX + dosW + 12;
    }

    let ty = boxY + boxH - 16;
    p.drawText(safe(collection.nom), { x: textX, y: ty, size: 13, font: fontBold, color: HEADER_TEXT });
    ty -= 14;
    const metaLine1 = [collection.pays, collection.annee].filter(Boolean).join(" - ");
    if (metaLine1) {
      p.drawText(safe(metaLine1), { x: textX, y: ty, size: 8, font, color: HEADER_MUTED });
      ty -= 11;
    }
    const archived = collection.total ? `${cards.length} / ${collection.total} cartes archivees` : `${cards.length} cartes archivees`;
    p.drawText(safe(archived), { x: textX, y: ty, size: 8, font, color: HEADER_MUTED });
  }

  function newPage() {
    const p = pdfDoc.addPage([pageWidth, pageHeight]);
    drawIdentityBand(p);
    return p;
  }

  let page = newPage();

  let y = pageHeight - headerH - 24;
  const dateStr = new Date().toLocaleDateString("fr-FR");
  page.drawText(`Checklist generee le ${dateStr} - DB Non-Off 90's`, { x: marginX, y, size: 7.5, font, color: MUTED });
  y -= 24;

  const cols = 4, colGap = 14;
  const colW = (pageWidth - marginX * 2 - colGap * (cols - 1)) / cols;
  const thumbW = colW, thumbH = thumbW * 1.35;
  const textH = 40, rowGap = 14;
  const cellH = thumbH + textH;

  for (let i = 0; i < cards.length; i++) {
    const col = i % cols;

    if (col === 0) {
      if (i !== 0) y -= cellH + rowGap;
      if (y - cellH < 40) {
        page = newPage();
        y = pageHeight - headerH - 24;
      }
    }

    const c = cards[i];
    const thumb = thumbImages[i];
    const x = marginX + col * (colW + colGap);

    if (thumb) {
      page.drawImage(thumb, { x, y: y - thumbH, width: thumbW, height: thumbH });
    } else {
      page.drawRectangle({ x, y: y - thumbH, width: thumbW, height: thumbH, borderColor: MUTED, borderWidth: 0.6 });
    }

    page.drawRectangle({ x, y: y - thumbH - 14, width: 9, height: 9, borderColor: MUTED, borderWidth: 0.7 });
    page.drawText(safe(c.numero), { x: x + 13, y: y - thumbH - 13, size: 8, font: fontBold, color: ACCENT });
    page.drawText(safe(c.personnage).slice(0, 16), { x, y: y - thumbH - 26, size: 8.5, font, color: INK });
    page.drawText(safe(c.rarete).slice(0, 18), { x, y: y - thumbH - 37, size: 7, font: fontItalic, color: MUTED });
  }

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="checklist-${collection.nom.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
