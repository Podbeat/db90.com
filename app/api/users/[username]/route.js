import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { computeParticipation } from "@/lib/participation";
import { getCompletedCollections, collectionPreviews } from "@/lib/registry";
import { traderStats } from "@/lib/trades";

// Page profil publique (voir /u/[username]) : tout ce qui est renvoyé ici est visible par
// n'importe quel visiteur, connecté ou non — jamais l'e-mail ni aucune donnée privée.
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, avatar: true, bio: true, createdAt: true, showcase: true },
    });
    if (!user) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

    const [entries, listings, participation] = await Promise.all([
      prisma.userCard.findMany({
        where: { userId: user.id },
        include: { card: { include: { collection: { select: { id: true, nom: true } }, personnagePrincipal: true } } },
      }),
      prisma.cardListing.findMany({
        where: { userId: user.id, type: "seller" },
        include: { card: { include: { collection: { select: { id: true, nom: true } }, personnagePrincipal: true } } },
      }),
      computeParticipation(user.id),
    ]);

    // Un badge par collection complète (vignette de la série), la progression dans chaque
    // collection commencée, et la réputation d'échangeur (avis positifs, échanges terminés).
    const [completedCollections, collections, tradeStats] = await Promise.all([
      getCompletedCollections(participation.completedCollectionIds),
      collectionsProgress(entries.filter((e) => e.status === "owned").map((e) => e.card)),
      traderStats([user.id]).then((stats) => stats.get(user.id)),
    ]);

    const owned = entries
      .filter((e) => e.status === "owned")
      .map((e) => ({ ...e.card, forTrade: e.forTrade }))
      .sort(naturalSortByNumero);
    // Cartes « À l'échange » : celles que le membre accepte d'échanger.
    const forTrade = owned.filter((c) => c.forTrade);
    // Classeur : dans l'ordre choisi, en ne gardant que les cartes toujours possédées.
    const ownedById = new Map(owned.map((c) => [c.id, c]));
    const showcase = (user.showcase || []).map((id) => ownedById.get(id)).filter(Boolean);
    const wanted = entries.filter((e) => e.status === "wanted").map((e) => e.card).sort(naturalSortByNumero);
    const selling = listings.sort((a, b) => naturalSortByNumero(a.card, b.card));

    return NextResponse.json({
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      memberSince: user.createdAt,
      owned,
      forTrade,
      wanted,
      selling,
      participation,
      completedCollections,
      collections,
      tradeStats,
      showcase,
    });
  } catch (e) {
    console.error("Erreur GET /api/users/[username] :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

// Progression du membre dans chaque collection commencée : références (numéros) possédées
// sur le total de la série (ou sur le nombre de références cataloguées si le total n'est pas
// connu), des plus avancées aux moins avancées.
async function collectionsProgress(ownedCards) {
  const numerosByCollection = new Map();
  for (const c of ownedCards) {
    if (!numerosByCollection.has(c.collectionId)) numerosByCollection.set(c.collectionId, new Set());
    numerosByCollection.get(c.collectionId).add(c.numero);
  }
  const ids = [...numerosByCollection.keys()];
  if (ids.length === 0) return [];
  const [collections, catalogue, previews] = await Promise.all([
    prisma.collection.findMany({ where: { id: { in: ids } }, select: { id: true, nom: true, total: true } }),
    prisma.card.findMany({ where: { collectionId: { in: ids } }, select: { collectionId: true, numero: true } }),
    collectionPreviews(ids),
  ]);
  const catalogued = new Map();
  for (const c of catalogue) {
    if (!catalogued.has(c.collectionId)) catalogued.set(c.collectionId, new Set());
    catalogued.get(c.collectionId).add(c.numero);
  }
  return collections
    .map((col) => {
      const owned = numerosByCollection.get(col.id).size;
      const total = col.total || catalogued.get(col.id)?.size || owned;
      return {
        id: col.id,
        nom: col.nom,
        owned: Math.min(owned, total),
        total,
        totalKnown: Boolean(col.total),
        complete: Boolean(col.total) && owned >= col.total,
        previewImage: previews.get(col.id) || null,
      };
    })
    .sort((a, b) => b.owned / b.total - a.owned / a.total || a.nom.localeCompare(b.nom));
}
