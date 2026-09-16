import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { processDisplayImage } from "@/lib/storage";

export const runtime = "nodejs";

async function loadEditable(id, userId) {
  const submission = await prisma.collectionSubmission.findUnique({ where: { id } });
  if (!submission || submission.userId !== userId) return null;
  if (submission.status === "approved" || submission.status === "rejected") return null;
  return submission;
}

// Ajoute une carte à une proposition de collection, une par une — même traitement d'image
// que les autres imports du site (redimensionnement, filigrane).
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id } = await params;
    const submission = await loadEditable(id, session.sub);
    if (!submission) return NextResponse.json({ error: "Proposition introuvable ou non modifiable." }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    const numero = (formData.get("numero") || "").toString().trim();
    const rarete = (formData.get("rarete") || "Commune").toString().trim() || "Commune";
    const personnagePrincipalId = formData.get("personnagePrincipalId") || null;

    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    if (!numero) return NextResponse.json({ error: "La référence de la carte est obligatoire." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { display } = await processDisplayImage(buffer, file.name, { watermark: true });

    const card = await prisma.collectionSubmissionCard.create({
      data: { submissionId: id, numero, rarete, personnagePrincipalId: personnagePrincipalId || null, image: display },
      include: { personnagePrincipal: true },
    });

    // Touche la proposition pour remonter en tête de liste côté membre.
    await prisma.collectionSubmission.update({ where: { id }, data: { updatedAt: new Date() } });

    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/collection-submissions/[id]/cards :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
