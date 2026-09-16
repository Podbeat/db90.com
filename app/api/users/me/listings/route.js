import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { naturalSortByNumero } from "@/lib/naturalSort";

// Liste les annonces de vente (et, séparément, d'achat) de l'utilisateur connecté, avec
// les infos de carte nécessaires pour les afficher — utilisé par "Mes ventes".
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const listings = await prisma.cardListing.findMany({
      where: { userId: session.sub },
      include: {
        card: {
          include: { personnagePrincipal: true, collection: { select: { id: true, nom: true } } },
        },
      },
    });

    const selling = listings.filter((l) => l.type === "seller").sort((a, b) => naturalSortByNumero(a.card, b.card));
    const buying = listings.filter((l) => l.type === "buyer").sort((a, b) => naturalSortByNumero(a.card, b.card));

    return NextResponse.json({ selling, buying });
  } catch (e) {
    console.error("Erreur GET /api/users/me/listings :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
