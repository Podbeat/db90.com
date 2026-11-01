import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { listingInclude } from "@/lib/market";

const NO_STORE = { "Cache-Control": "private, no-store" };
const SHOWN = 8;

// « Pour toi » sur le Marché : les cartes que le membre recherche et que d'autres vendent, et
// les recherches d'autres membres pour des cartes qu'il possède. Propre à chacun, jamais en cache.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });

    const mine = await prisma.userCard.findMany({ where: { userId: session.sub }, select: { cardId: true, status: true } });
    const wantedIds = mine.filter((c) => c.status === "wanted").map((c) => c.cardId);
    const ownedIds = mine.filter((c) => c.status === "owned").map((c) => c.cardId);
    const others = { userId: { not: session.sub } };

    const [forSale, buyers] = await Promise.all([
      wantedIds.length
        ? prisma.cardListing.findMany({
            where: { type: "seller", cardId: { in: wantedIds }, ...others },
            include: listingInclude,
            orderBy: { createdAt: "desc" },
            take: SHOWN,
          })
        : [],
      ownedIds.length
        ? prisma.cardListing.findMany({
            where: { type: "buyer", cardId: { in: ownedIds }, ...others },
            include: listingInclude,
            orderBy: { createdAt: "desc" },
            take: SHOWN,
          })
        : [],
    ]);

    return NextResponse.json({ forSale, buyers, wantedCount: wantedIds.length }, { headers: NO_STORE });
  } catch (e) {
    console.error("Erreur GET /api/market/me :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500, headers: NO_STORE });
  }
}
