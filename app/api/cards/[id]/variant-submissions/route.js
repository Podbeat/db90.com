import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canonicalEffect, UNKNOWN_EFFECT_ERROR } from "@/lib/effects";
import { resolveUserSession } from "@/lib/currentUser";
import { processDisplayImage } from "@/lib/storage";
import { isOriginalUrl } from "@/lib/originals";

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
    const originalUrl = isOriginalUrl(formData.get("originalUrl")) ? formData.get("originalUrl") : null;
    // Effet choisi dans la liste ; vide = « je ne sais pas », l'administrateur le précisera.
    const rarete = await canonicalEffect(formData.get("rarete"));
    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    if (rarete === undefined) return NextResponse.json({ error: UNKNOWN_EFFECT_ERROR }, { status: 400 });
    if (rarete && rarete === referenceCard.rarete) return NextResponse.json({ error: "Cette carte existe déjà avec cet effet." }, { status: 409 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { display } = await processDisplayImage(buffer, file.name, { watermark: true });

    const submission = await prisma.cardSubmission.create({
      data: {
        userId: session.sub,
        collectionId: referenceCard.collectionId,
        numero: referenceCard.numero,
        rarete,
        image: display,
        originalUrl,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, status: submission.status });
  } catch (e) {
    console.error("Erreur POST /api/cards/[id]/variant-submissions :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
