import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Renvoie les valeurs disponibles pour peupler les filtres du catalogue (collections,
// personnages, effets/prismes, pays d'origine), en tenant compte des filtres déjà actifs.
//
// Le principe : pour calculer les options d'UN filtre (ex. personnages), on applique tous
// les AUTRES filtres actifs (collection, pays, effet, recherche) mais pas celui-là — ainsi
// la liste des personnages proposée ne contient que ceux qui existent réellement compte
// tenu du reste de la sélection (ex. si "Taïwan" est choisi, un personnage absent des
// cartes taïwanaises n'apparaît plus), sans jamais aboutir à une combinaison vide.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const collectionId = searchParams.get("collectionId");
    const rarete = searchParams.get("rarete");
    const personnage = searchParams.get("personnage"); // id de Character
    const pays = searchParams.get("pays");

    function baseWhere(exclude) {
      const clauses = [];
      if (collectionId && collectionId !== "all" && exclude !== "collection") clauses.push({ collectionId });
      if (rarete && rarete !== "all" && exclude !== "rarete") clauses.push({ rarete });
      if (personnage && personnage !== "all" && exclude !== "personnage") {
        clauses.push({ OR: [{ personnagePrincipalId: personnage }, { personnagesSecondaires: { some: { characterId: personnage } } }] });
      }
      if (pays && pays !== "all" && exclude !== "pays") clauses.push({ collection: { pays } });
      if (q) {
        clauses.push({
          OR: [
            { personnagePrincipal: { name: { contains: q, mode: "insensitive" } } },
            { numero: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        });
      }
      return clauses.length ? { AND: clauses } : {};
    }

    const [personnageCards, raretes, paysRows, collectionRows] = await Promise.all([
      prisma.card.findMany({
        where: baseWhere("personnage"),
        select: { personnagePrincipalId: true, personnagesSecondaires: { select: { characterId: true } } },
      }),
      prisma.card.findMany({
        where: baseWhere("rarete"),
        distinct: ["rarete"],
        select: { rarete: true },
        orderBy: { rarete: "asc" },
      }),
      prisma.card.findMany({
        where: baseWhere("pays"),
        select: { collection: { select: { pays: true } } },
      }),
      prisma.card.findMany({
        where: baseWhere("collection"),
        distinct: ["collectionId"],
        select: { collectionId: true, collection: { select: { nom: true } } },
      }),
    ]);

    const characterIds = new Set();
    for (const c of personnageCards) {
      if (c.personnagePrincipalId) characterIds.add(c.personnagePrincipalId);
      for (const s of c.personnagesSecondaires) characterIds.add(s.characterId);
    }
    const personnages = characterIds.size
      ? await prisma.character.findMany({ where: { id: { in: [...characterIds] } }, orderBy: { name: "asc" } })
      : [];

    const paysSet = Array.from(new Set(paysRows.map((r) => r.collection?.pays).filter(Boolean))).sort();
    const collections = collectionRows
      .map((r) => ({ id: r.collectionId, nom: r.collection?.nom || "" }))
      .filter((c) => c.nom)
      .sort((a, b) => a.nom.localeCompare(b.nom));

    return NextResponse.json({
      personnages: personnages.map((p) => ({ id: p.id, name: p.name })),
      raretes: raretes.map((r) => r.rarete).filter(Boolean),
      pays: paysSet,
      collections,
    });
  } catch (e) {
    console.error("Erreur GET /api/facets :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
