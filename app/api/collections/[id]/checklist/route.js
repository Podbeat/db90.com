import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

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

  const pageWidth = 595.28; // A4 portrait, en points
  const pageHeight = 841.89;
  const marginX = 50;
  const rowHeight = 20;

  const colCheckX = marginX;
  const colNumX = marginX + 25;
  const colNomX = marginX + 90;
  const colRareteX = marginX + 310;
  const rightEdge = pageWidth - marginX;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 60;

  function drawHeaderBlock() {
    page.drawText(collection.nom, { x: marginX, y, size: 16, font: fontBold });
    y -= 18;
    const meta = [collection.editeur, collection.pays, collection.annee].filter(Boolean).join(" - ");
    if (meta) {
      page.drawText(meta, { x: marginX, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 14;
    }
    const dateStr = new Date().toLocaleDateString("fr-FR");
    page.drawText(`Checklist generee le ${dateStr} - DB Non-Off 90's`, { x: marginX, y, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
    y -= 24;
  }

  function drawColumnHeader() {
    page.drawText("Ref.", { x: colNumX, y, size: 9, font: fontBold });
    page.drawText("Personnage", { x: colNomX, y, size: 9, font: fontBold });
    page.drawText("Variante", { x: colRareteX, y, size: 9, font: fontBold });
    y -= 6;
    page.drawLine({ start: { x: marginX, y }, end: { x: rightEdge, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= rowHeight - 6;
  }

  drawHeaderBlock();
  drawColumnHeader();

  // Une seule police standard (WinAnsi) : on retire les accents pour éviter tout caractère
  // hors de son jeu de caractères plutôt que de faire planter la génération du PDF.
  function safe(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x00-\x7F]/g, "?");
  }

  for (const c of cards) {
    if (y < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 60;
      drawColumnHeader();
    }

    page.drawRectangle({
      x: colCheckX,
      y: y - 2,
      width: 10,
      height: 10,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.7,
    });

    page.drawText(safe(c.numero), { x: colNumX, y, size: 9, font });
    page.drawText(safe(c.personnage).slice(0, 38), { x: colNomX, y, size: 9, font });
    page.drawText(safe(c.rarete).slice(0, 30), { x: colRareteX, y, size: 9, font });

    y -= rowHeight;
  }

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="checklist-${collection.nom.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
