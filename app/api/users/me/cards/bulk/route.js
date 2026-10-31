import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";
import { applyStatusChanges } from "@/lib/userCardChanges";

const MAX_UPDATES = 500;
const STATUSES = new Set(["owned", "trade", "wanted", null]);

// Change d'un coup le statut de plusieurs cartes (« Cocher en lot » sur une page de
// collection, et son annulation). Corps : { updates: [{ cardId, status }] }, status valant
// "owned", "trade" (à l'échange), "wanted" ou null pour retirer la carte du suivi.
//
// Seules les cartes dont le statut change réellement sont touchées, et la réponse renvoie
// leur statut d'avant (`previous`) : renvoyé tel quel, il annule l'action. Mêmes effets que
// le changement carte par carte (voir lib/userCardChanges.js).
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const updates = Array.isArray(body?.updates) ? body.updates : null;
    if (!updates || updates.length === 0) return NextResponse.json({ error: "Aucune carte." }, { status: 400 });
    if (updates.length > MAX_UPDATES) return NextResponse.json({ error: "Trop de cartes à la fois." }, { status: 400 });

    // Une seule entrée par carte (la dernière l'emporte), statuts valides uniquement.
    const wanted = new Map();
    for (const u of updates) {
      if (!u || typeof u.cardId !== "string" || !STATUSES.has(u.status ?? null)) {
        return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      }
      wanted.set(u.cardId, u.status ?? null);
    }

    const found = await prisma.card.count({ where: { id: { in: [...wanted.keys()] } } });
    if (found !== wanted.size) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

    const changes = await applyStatusChanges(session.sub, wanted);
    return NextResponse.json({
      ok: true,
      changed: changes.length,
      previous: changes.map((c) => ({ cardId: c.cardId, status: c.previous })),
    });
  } catch (e) {
    console.error("Erreur POST /api/users/me/cards/bulk :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
