import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { naturalSortByNumero } from "@/lib/naturalSort";

// Liste les cartes suivies par l'utilisateur connecté, groupées par statut, avec les infos
// nécessaires pour les afficher (image, collection...) — utilisé par la page "Mon compte".
// Avec ?cardId=... : renvoie uniquement le statut de cette carte précise (utilisé sur la
// fiche carte, pour afficher "Je l'ai" / "Je la recherche" sans tout recharger).
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId");
    if (cardId) {
      const entry = await prisma.userCard.findUnique({
        where: { userId_cardId: { userId: session.sub, cardId } },
      });
      return NextResponse.json({ status: entry?.status || null });
    }

    const entries = await prisma.userCard.findMany({
      where: { userId: session.sub },
      include: { card: { include: { collection: { select: { id: true, nom: true } } } } },
    });

    const owned = entries.filter((e) => e.status === "owned").map((e) => e.card).sort(naturalSortByNumero);
    const wanted = entries.filter((e) => e.status === "wanted").map((e) => e.card).sort(naturalSortByNumero);

    return NextResponse.json({ owned, wanted });
  } catch (e) {
    console.error("Erreur GET /api/users/me/cards :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}

// Définit le statut d'une carte pour l'utilisateur connecté : "owned", "wanted", ou null
// pour retirer la carte de son suivi. Une carte ne peut avoir qu'un seul statut à la fois
// (le passer à "owned" alors qu'elle était "wanted" la fait simplement changer de liste).
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const { cardId, status } = await request.json();
    if (!cardId) return NextResponse.json({ error: "Carte manquante." }, { status: 400 });
    if (status !== null && status !== "owned" && status !== "wanted") {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    if (status === null) {
      await prisma.userCard.deleteMany({ where: { userId: session.sub, cardId } });
      return NextResponse.json({ ok: true, status: null });
    }

    const entry = await prisma.userCard.upsert({
      where: { userId_cardId: { userId: session.sub, cardId } },
      update: { status },
      create: { userId: session.sub, cardId, status },
    });
    return NextResponse.json({ ok: true, status: entry.status });
  } catch (e) {
    console.error("Erreur POST /api/users/me/cards :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
