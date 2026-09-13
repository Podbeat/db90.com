import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const BODY_BG = rgb(0.961, 0.945, 0.910);
const HEADER_BG = rgb(0.071, 0.125, 0.227);
const HEADER_LINE = rgb(0.165, 0.235, 0.369);
const HEADER_TEXT = rgb(0.933, 0.949, 0.980);
const HEADER_MUTED = rgb(0.557, 0.639, 0.769);
const INK = rgb(0.051, 0.082, 0.149);
const MUTED = rgb(0.478, 0.443, 0.361);
const ACCENT = rgb(0.949, 0.443, 0.109);
const GOLD = rgb(0.878, 0.690, 0.290);

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

export async function GET(request) {
  const session = await resolveUserSession(request);
  if (!session) return new Response("Non connecté.", { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return new Response("Introuvable.", { status: 404 });

  const entries = await prisma.userCard.findMany({
    where: { userId: user.id, status: "wanted" },
    include: { card: { include: { collection: { select: { nom: true } } } } },
  });

  const cards = entries.map((e) => e.card).sort(naturalSortByNumero);

  const byCollection = new Map();
  for (const c of cards) {
    const key = c.collection.nom;
    if (!byCollection.has(key)) byCollection.set(key, []);
    byCollection.get(key).push(c);
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

  const thumbBytesList = await Promise.all(cards.map((c) => fetchImageBytes(c.image)));
  const thumbImages = new Map();
  for (let i = 0; i < cards.length; i++) {
    const bytes = thumbBytesList[i];
    if (!bytes) continue;
    try {
      thumbImages.set(cards[i].id, await pdfDoc.embedJpg(bytes));
    } catch (e) {
      // scan illisible : on affichera un cadre vide pour cette carte
    }
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 50;
  const headerH = 95;

  function drawHeader(p) {
    p.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: BODY_BG });
    p.drawRectangle({ x: 0, y: pageHeight - headerH, width: pageWidth, height: headerH, color: HEADER_BG });
    p.drawLine({ start: { x: 0, y: pageHeight - headerH }, end: { x: pageWidth, y: pageHeight - headerH }, thickness: 0.6, color: HEADER_LINE });
    p.drawRectangle({ x: 0, y: pageHeight - headerH - 3, width: pageWidth, height: 3, color: ACCENT });
    p.drawRectangle({ x: 0, y: pageHeight - headerH - 1, width: pageWidth, height: 1, color: rgb(1, 0.95, 0.8) });

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

    const boxX = pageWidth / 2 - 10;
    const boxW = pageWidth - marginX - boxX;
    const boxY = pageHeight - headerH + 14;
    const boxH = headerH - 28;
    p.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderColor: GOLD, borderWidth: 0.8 });
    let ty = boxY + boxH - 16;
    p.drawText(`Liste de recherche de ${safe(user.username)}`, { x: boxX + 10, y: ty, size: 11, font: fontBold, color: HEADER_TEXT });
    ty -= 14;
    p.drawText(`${cards.length} carte(s) recherchee(s)`, { x: boxX + 10, y: ty, size: 8, font, color: HEADER_MUTED });
  }

  function newPage() {
    const p = pdfDoc.addPage([pageWidth, pageHeight]);
    drawHeader(p);
    return p;
  }

  let page = newPage();
  let y = pageHeight - headerH - 24;
  const dateStr = new Date().toLocaleDateString("fr-FR");
  page.drawText(`Genere le ${dateStr} - DB Non-Off 90's`, { x: marginX, y, size: 7.5, font, color: MUTED });
  y -= 24;

  if (cards.length === 0) {
    page.drawText("Aucune carte recherchee pour l'instant.", { x: marginX, y, size: 10, font: fontItalic, color: MUTED });
  }

  const cols = 4, colGap = 14;
  const colW = (pageWidth - marginX * 2 - colGap * (cols - 1)) / cols;
  const thumbW = colW, thumbH = thumbW * 1.35;
  const textH = 40, rowGap = 14;
  const cellH = thumbH + textH;

  for (const [collectionNom, collectionCards] of byCollection) {
    if (y - 20 < 60) { page = newPage(); y = pageHeight - headerH - 24; }
    page.drawText(safe(collectionNom), { x: marginX, y, size: 12, font: fontBold, color: INK });
    y -= 6;
    page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 0.5, color: MUTED });
    y -= 18;

    for (let i = 0; i < collectionCards.length; i++) {
      const col = i % cols;
      if (col === 0) {
        if (i !== 0) y -= cellH + rowGap;
        if (y - cellH < 40) { page = newPage(); y = pageHeight - headerH - 24; }
      }

      const c = collectionCards[i];
      const thumb = thumbImages.get(c.id);
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
    y -= cellH + rowGap + 10;
  }

  const pdfBytes = await pdfDoc.save();
  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="liste-recherche-${safe(user.username)}.pdf"`,
    },
  });
}
