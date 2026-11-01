import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicCacheHeaders } from "@/lib/httpCache";
import { listingInclude, marketWhere } from "@/lib/market";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Vue d'ensemble de toute l'activité d'achat/vente du site (annonces "seller" et "buyer"
// confondues), avec des filtres qui se restreignent mutuellement comme sur le catalogue,
// les compteurs par type (onglets À vendre / Recherchées) et les chiffres du marché.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all | seller | buyer
    const collectionId = searchParams.get("collectionId");
    const personnage = searchParams.get("personnage");
    const pays = searchParams.get("pays");
    const condition = searchParams.get("condition"); // état, pour les cartes en vente
    const sort = searchParams.get("sort") || "recent"; // recent | price_asc | price_desc
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "30", 10)));

    const filters = { type, collectionId, personnage, pays, condition };

    // Les annonces sans prix (recherches) passent toujours après celles qui en ont un.
    const orderBy =
      sort === "price_asc"
        ? [{ price: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
        : sort === "price_desc"
          ? [{ price: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

    const byType = marketWhere({ ...filters, exclude: "type" });
    const [total, listings, sellerCount, buyerCount, selling, wanted, members, new7d] = await Promise.all([
      prisma.cardListing.count({ where: marketWhere(filters) }),
      prisma.cardListing.findMany({
        where: marketWhere(filters),
        include: listingInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      // Compteurs des onglets : mêmes filtres, sauf le type.
      prisma.cardListing.count({ where: { AND: [byType, { type: "seller" }] } }),
      prisma.cardListing.count({ where: { AND: [byType, { type: "buyer" }] } }),
      // Chiffres du marché, sans filtre.
      prisma.cardListing.count({ where: { type: "seller" } }),
      prisma.cardListing.count({ where: { type: "buyer" } }),
      prisma.cardListing.groupBy({ by: ["userId"] }),
      prisma.cardListing.count({ where: { createdAt: { gte: new Date(Date.now() - WEEK_MS) } } }),
    ]);

    // Facettes : options de filtre disponibles compte tenu des AUTRES filtres déjà actifs,
    // calculées uniquement à partir des annonces actuellement actives (pas tout le
    // catalogue) — inutile de proposer un pays où personne ne vend/cherche rien en ce moment.
    const [collectionRows, paysRows, personnageRows] = await Promise.all([
      prisma.cardListing.findMany({
        where: marketWhere({ ...filters, exclude: "collection" }),
        select: { card: { select: { collectionId: true, collection: { select: { nom: true } } } } },
        distinct: ["cardId"],
      }),
      prisma.cardListing.findMany({
        where: marketWhere({ ...filters, exclude: "pays" }),
        select: { card: { select: { collection: { select: { pays: true } } } } },
        distinct: ["cardId"],
      }),
      prisma.cardListing.findMany({
        where: marketWhere({ ...filters, exclude: "personnage" }),
        select: {
          card: { select: { personnagePrincipalId: true, personnagesSecondaires: { select: { characterId: true } } } },
        },
      }),
    ]);

    const collections = [
      ...new Map(
        collectionRows
          .filter((r) => r.card.collectionId)
          .map((r) => [r.card.collectionId, { id: r.card.collectionId, nom: r.card.collection?.nom || "" }])
      ).values(),
    ].sort((a, b) => a.nom.localeCompare(b.nom));

    const paysSet = [...new Set(paysRows.map((r) => r.card.collection?.pays).filter(Boolean))].sort();

    const characterIds = new Set();
    for (const r of personnageRows) {
      if (r.card.personnagePrincipalId) characterIds.add(r.card.personnagePrincipalId);
      for (const s of r.card.personnagesSecondaires) characterIds.add(s.characterId);
    }
    const personnages = characterIds.size
      ? await prisma.character.findMany({ where: { id: { in: [...characterIds] } }, orderBy: { name: "asc" } })
      : [];

    return NextResponse.json({
      listings,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      counts: { all: sellerCount + buyerCount, seller: sellerCount, buyer: buyerCount },
      stats: { selling, wanted, members: members.length, new7d },
      facets: {
        collections,
        pays: paysSet,
        personnages: personnages.map((p) => ({ id: p.id, name: p.name })),
      },
    }, {
      // Cache plus court que les autres routes : un membre qui vient de publier une
      // annonce doit la retrouver vite sur le Marché.
      headers: publicCacheHeaders(request, { sMaxAge: 30, staleWhileRevalidate: 60 }),
    });
  } catch (e) {
    console.error("Erreur GET /api/market :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
