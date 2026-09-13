const { prisma } = require("./db");

// Coefficients de conversion vers une "côte neuve" équivalente : le prix d'une carte en
// moins bon état est ramené à ce qu'elle vaudrait à l'état neuf, pour pouvoir comparer et
// moyenner des annonces d'états différents sur une même base.
const CONDITION_MULTIPLIERS = {
  Neuve: 1,
  "Très bon état": 0.85,
  "Bon état": 0.65,
  Satisfaisant: 0.45,
};

/**
 * Calcule la côte "neuve" d'une carte à partir de ses annonces de vente actives, en ne
 * retenant QUE les annonces en Très bon état ou Neuve (les plus fiables comme référence) :
 * une annonce en Très bon état est divisée par son coefficient (0.85) pour estimer ce que
 * la carte vaudrait à l'état neuf, puis on moyenne toutes ces estimations.
 *
 * `listings` : tableau de { condition, price }. Renvoie null si aucune annonce exploitable.
 */
function computeCoteNeuve(listings) {
  const values = [];
  for (const l of listings || []) {
    if (l.price == null) continue;
    if (l.condition === "Neuve") values.push(l.price);
    else if (l.condition === "Très bon état") values.push(l.price / CONDITION_MULTIPLIERS["Très bon état"]);
  }
  if (values.length === 0) return null;
  const coteNeuve = values.reduce((a, b) => a + b, 0) / values.length;
  return { coteNeuve, sampleSize: values.length };
}

/**
 * À partir d'une côte "neuve", dérive la côte estimée pour chaque état — c'est ce qui
 * s'affiche comme grille de référence sur la fiche carte. Les utilisateurs restent libres
 * de vendre au prix qu'ils veulent ; ceci n'est qu'une indication de marché.
 */
function coteByCondition(coteNeuve) {
  if (coteNeuve == null) return null;
  return Object.fromEntries(
    Object.entries(CONDITION_MULTIPLIERS).map(([condition, mult]) => [condition, Math.round(coteNeuve * mult * 100) / 100])
  );
}

/**
 * Recalcule la côte d'une carte à partir de ses annonces actuelles (Très bon état/Neuve)
 * et enregistre un nouveau point d'historique si elle a changé depuis le dernier point
 * connu — appelé après toute création/modification/suppression d'annonce de vente
 * susceptible de faire varier la côte.
 */
async function recordCoteSnapshot(cardId) {
  try {
    const listings = await prisma.cardListing.findMany({
      where: { cardId, type: "seller", condition: { in: ["Neuve", "Très bon état"] }, price: { not: null } },
      select: { condition: true, price: true },
    });
    const result = computeCoteNeuve(listings);
    if (!result) return;

    const last = await prisma.priceHistory.findFirst({ where: { cardId }, orderBy: { createdAt: "desc" } });
    if (last && Math.abs(last.cote - result.coteNeuve) < 0.01 && last.sampleSize === result.sampleSize) {
      return; // rien de nouveau à tracer
    }

    await prisma.priceHistory.create({
      data: { cardId, cote: result.coteNeuve, sampleSize: result.sampleSize },
    });
  } catch (e) {
    // Best-effort : un souci ici ne doit jamais faire échouer la création/suppression
    // de l'annonce elle-même.
    console.error("Erreur recordCoteSnapshot :", e);
  }
}

module.exports = { CONDITION_MULTIPLIERS, computeCoteNeuve, coteByCondition, recordCoteSnapshot };
