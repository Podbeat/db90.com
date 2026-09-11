import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";
import PDFDocument from "pdfkit";

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

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).text(collection.nom, { align: "left" });
  const meta = [collection.editeur, collection.pays, collection.annee].filter(Boolean).join(" · ");
  if (meta) doc.fontSize(10).fillColor("#666666").text(meta);
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor("#999999").text(`Checklist générée le ${new Date().toLocaleDateString("fr-FR")} — DB Non-Off 90's`);
  doc.moveDown(1);
  doc.fillColor("#000000");

  const startX = 50;
  let y = doc.y;
  const rowHeight = 20;
  const colCheckW = 25, colNumW = 60, colNomW = 220, colRareteW = 180;

  function drawHeader() {
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("", startX, y, { width: colCheckW });
    doc.text("Réf.", startX + colCheckW, y, { width: colNumW });
    doc.text("Personnage", startX + colCheckW + colNumW, y, { width: colNomW });
    doc.text("Variante", startX + colCheckW + colNumW + colNomW, y, { width: colRareteW });
    y += rowHeight;
    doc.moveTo(startX, y - 4).lineTo(545, y - 4).strokeColor("#cccccc").stroke();
    doc.font("Helvetica");
  }

  drawHeader();

  for (const c of cards) {
    if (y > 760) {
      doc.addPage();
      y = 50;
      drawHeader();
    }
    doc.rect(startX + 4, y, 12, 12).strokeColor("#999999").stroke();
    doc.fontSize(9).fillColor("#000000");
    doc.text(c.numero, startX + colCheckW, y, { width: colNumW });
    doc.text(c.personnage, startX + colCheckW + colNumW, y, { width: colNomW });
    doc.text(c.rarete || "", startX + colCheckW + colNumW + colNomW, y, { width: colRareteW });
    y += rowHeight;
  }

  doc.end();
  const pdfBuffer = await done;

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="checklist-${collection.nom.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
