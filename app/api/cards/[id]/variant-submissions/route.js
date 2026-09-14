import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { processDisplayImage } from "@/lib/storage";

export const runtime = "nodejs";

// Un utilisateur propose un scan pour un effet/prisme qui n'existe PAS ENCORE pour ce
// numéro (ex. la carte existe en "Prisme Soft", il en a un exemplaire en "Prisme Bris de
// Verre"). Contrairement à /api/cards/[id]/submissions (qui complète une carte existante
// sans visuel), ceci crée — après validation admin — une toute NOUVELLE carte : même
// numéro et personnage que la carte de référence, mais un effet différent.
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id: referenceCardId } = await params;
    const referenceCard = await prisma.card.findUnique({ where: { id: referenceCardId } });
    if (!referenceCard) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file");
    const rarete = (formData.get("rarete") || "").toString().trim();
    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    if (!rarete) return NextResponse.json({ error: "Précisez le nom de l'effet/prisme." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { display } = await processDisplayImage(buffer, file.name, { watermark: true });

    const submission = await prisma.cardSubmission.create({
      data: {
        userId: session.sub,
        collectionId: referenceCard.collectionId,
        numero: referenceCard.numero,
        rarete,
        image: display,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, status: submission.status });
  } catch (e) {
    console.error("Erreur POST /api/cards/[id]/variant-submissions :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
