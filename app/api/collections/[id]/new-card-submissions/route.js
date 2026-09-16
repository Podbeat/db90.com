import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { processDisplayImage } from "@/lib/storage";

export const runtime = "nodejs";

// Propose une carte pas encore répertoriée pour une collection dont on ne connaît pas
// encore le nombre total de cartes ("en cours de catalogage"). Contrairement aux autres
// scans proposés, il n'y a ici ni carte existante ni numéro de référence connu à l'avance
// — c'est l'utilisateur qui l'indique. Après validation, ceci crée une toute nouvelle
// carte. Réservé aux collections dont le total est encore inconnu (voir l'admin pour
// définir la collection comme "terminée").
export async function POST(request, { params }) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { id: collectionId } = await params;
    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) return NextResponse.json({ error: "Collection introuvable." }, { status: 404 });
    if (collection.total != null) {
      return NextResponse.json({ error: "Cette collection est déjà complète, contactez un admin pour toute correction." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const numero = (formData.get("numero") || "").toString().trim();
    const rarete = (formData.get("rarete") || "Commune").toString().trim() || "Commune";
    const personnagePrincipalId = formData.get("personnagePrincipalId") || null;

    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    if (!numero) return NextResponse.json({ error: "Précisez la référence de la carte." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { display } = await processDisplayImage(buffer, file.name, { watermark: true });

    const submission = await prisma.cardSubmission.create({
      data: {
        userId: session.sub,
        collectionId,
        numero,
        rarete,
        personnagePrincipalId: personnagePrincipalId || null,
        image: display,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, status: submission.status });
  } catch (e) {
    console.error("Erreur POST /api/collections/[id]/new-card-submissions :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
