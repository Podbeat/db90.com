import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// Liste des propositions de collection de l'utilisateur connecté, tous statuts confondus.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const submissions = await prisma.collectionSubmission.findMany({
      where: { userId: session.sub },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { cards: true } } },
    });

    return NextResponse.json(submissions);
  } catch (e) {
    console.error("Erreur GET /api/users/me/collection-submissions :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Démarre une nouvelle proposition (juste les infos de la collection pour commencer — les
// cartes s'ajoutent une par une ensuite). Reste en "draft" tant que le membre ne clique pas
// sur "Soumettre pour validation".
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const body = await request.json();
    const nom = (body.nom || "").trim();
    if (!nom) return NextResponse.json({ error: "Le nom de la collection est obligatoire." }, { status: 400 });

    const submission = await prisma.collectionSubmission.create({
      data: {
        userId: session.sub,
        nom,
        annee: body.annee || null,
        editeur: body.editeur || null,
        pays: body.pays || null,
        total: body.total ? parseInt(body.total, 10) || null : null,
        description: body.description || null,
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/users/me/collection-submissions :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
