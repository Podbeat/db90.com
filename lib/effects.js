import { prisma } from "@/lib/db";

// Effets / prismes : une liste gérée par l'administration (table Effect). Les formulaires ne
// proposent que ces noms ; une carte sans effet connu garde un effet vide (« à définir »).

// Nom de la liste correspondant à `input` (sans tenir compte des majuscules), null si `input`
// est vide (effet à définir), undefined s'il n'est pas dans la liste.
export async function canonicalEffect(input) {
  const name = (input ?? "").toString().trim();
  if (!name) return null;
  const found = await prisma.effect.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { name: true },
  });
  return found ? found.name : undefined;
}

export const UNKNOWN_EFFECT_ERROR = "Choisissez un effet de la liste (ou « Je ne sais pas »).";

// Remplace un nom d'effet par un autre (ou par « à définir » si `to` est null) sur toutes les
// cartes et propositions en cours : à passer dans une transaction avec la mise à jour de la liste.
export function renameEverywhere(from, to) {
  return [
    prisma.card.updateMany({ where: { rarete: from }, data: { rarete: to } }),
    prisma.cardSubmission.updateMany({ where: { rarete: from }, data: { rarete: to } }),
    prisma.collectionSubmissionCard.updateMany({ where: { rarete: from }, data: { rarete: to } }),
  ];
}
