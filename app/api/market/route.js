import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const listingInclude = {
  card: {
    select: {
      id: true,
      numero: true,
      image: true,
      personnagePrincipal: { select: { id: true, name: true } },
      collection: { select: { id: true, nom: true, pays: true } },
    },
  },
  user: { select: { username: true, avatar: true } },
};

function baseWhere({ type, collectionId, personnage, pays, exclude }) {
  const clauses = [];
  if (type && type !== "all" && exclude !== "type") clauses.push({ type });
  if (collectionId && collectionId !== "all" && exclude !== "collection") clauses.push({ card: { collectionId } });
  if (personnage && personnage !== "all" && exclude !== "personnage") {
    clauses.push({
      OR: [
        { card: { personnagePrincipalId: personnage } },
        { card: { personnagesSecondaires: { some: { characterId: personnage } } } },
      ],
    });
  }
  if (pays && pays !== "all" && exclude !== "pays") clauses.push({ card: { collection: { pays } } });
  return clauses.length ? { AND: clauses } : {};
}

// Vue d'ensemble de toute l'activité d'achat/vente du site (annonces "seller" et "buyer"
// confondues), avec des filtres qui se restreignent mutuellement comme sur le catalogue.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all | seller | buyer
    const collectionId = searchParams.get("collectionId");
    const personnage = searchParams.get("personnage");
    const pays = searchParams.get("pays");
    const sort = searchParams.get("sort") || "recent"; // recent | price_asc | price_desc
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "30", 10)));

    const filters = { type, collectionId, personnage, pays };

    const orderBy =
      sort === "price_asc" ? [{ price: "asc" }] : sort === "price_desc" ? [{ price: "desc" }] : [{ createdAt: "desc" }];

    const [total, listings] = await Promise.all([
      prisma.cardListing.count({ where: baseWhere(filters) }),
      prisma.cardListing.findMany({
        where: baseWhere(filters),
        include: listingInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Facettes : options de filtre disponibles compte tenu des AUTRES filtres déjà actifs,
    // calculées uniquement à partir des annonces actuellement actives (pas tout le
    // catalogue) — inutile de proposer un pays où personne ne vend/cherche rien en ce moment.
    const [collectionRows, paysRows, personnageRows] = await Promise.all([
      prisma.cardListing.findMany({
        where: baseWhere({ ...filters, exclude: "collection" }),
        select: { card: { select: { collectionId: true, collection: { select: { nom: true } } } } },
        distinct: ["cardId"],
      }),
      prisma.cardListing.findMany({
        where: baseWhere({ ...filters, exclude: "pays" }),
        select: { card: { select: { collection: { select: { pays: true } } } } },
        distinct: ["cardId"],
      }),
      prisma.cardListing.findMany({
        where: baseWhere({ ...filters, exclude: "personnage" }),
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
      facets: {
        collections,
        pays: paysSet,
        personnages: personnages.map((p) => ({ id: p.id, name: p.name })),
      },
    });
  } catch (e) {
    console.error("Erreur GET /api/market :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
