import { prisma } from "@/lib/db";
import { getPalmares } from "@/lib/registry";
import {
  POINTS_PER_CARD,
  POINTS_PER_APPROVED_SCAN,
  POINTS_PER_COMPLETED_COLLECTION,
  POINTS_PER_APPROVED_COLLECTION_PROPOSAL,
} from "@/lib/participation";

// Classement des membres : mêmes points que sur les profils (lib/participation.js), calculés
// « depuis toujours » ou sur les 30 derniers jours, pour que les nouveaux venus aient aussi
// leur chance quand le site grandira. Quelques requêtes groupées, quel que soit le nombre de
// membres ; la réponse publique est mise en cache par le CDN (voir /api/leaderboard).

export const LEADERBOARD_PERIODS = ["tout", "30j"];
export const LEADERBOARD_PAGE_SIZE = 50;
export const BOARD_SIZE = 5;
export const POINTS = {
  card: POINTS_PER_CARD,
  scan: POINTS_PER_APPROVED_SCAN,
  completion: POINTS_PER_COMPLETED_COLLECTION,
  proposal: POINTS_PER_APPROVED_COLLECTION_PROPOSAL,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizePeriod(value) {
  return LEADERBOARD_PERIODS.includes(value) ? value : "tout";
}

export function periodSince(period, now = Date.now()) {
  return period === "30j" ? new Date(now - 30 * DAY_MS) : null;
}

const byValueThenName = (key) => (a, b) => b[key] - a[key] || a.user.username.localeCompare(b.user.username);

/**
 * Calcul pur (testable sans base) : agrège les compteurs par membre, calcule les points,
 * trie et numérote (ex æquo = même rang, puis on saute : 1, 2, 2, 4).
 * - owned / scans / proposals / trades : [{ userId, n }] issus des requêtes groupées ;
 * - completions : Map(pseudo → collections complétées sur la période) ;
 * - users : Map(userId → { username, avatar }).
 */
export function buildLeaderboard({ owned = [], scans = [], proposals = [], trades = [], completions = new Map(), users }) {
  const rows = new Map();
  const row = (userId) => {
    if (!rows.has(userId)) rows.set(userId, { userId, owned: 0, scans: 0, proposals: 0, trades: 0, completions: 0 });
    return rows.get(userId);
  };
  for (const r of owned) row(r.userId).owned = Number(r.n);
  for (const r of scans) row(r.userId).scans = Number(r.n);
  for (const r of proposals) row(r.userId).proposals = Number(r.n);
  for (const r of trades) row(r.userId).trades = Number(r.n);
  const idByName = new Map([...users].map(([id, u]) => [u.username, id]));
  for (const [username, n] of completions) {
    const id = idByName.get(username);
    if (id) row(id).completions = n;
  }

  const entries = [...rows.values()]
    .filter((r) => users.has(r.userId))
    .map((r) => ({
      ...r,
      user: users.get(r.userId),
      points:
        r.owned * POINTS.card + r.scans * POINTS.scan + r.completions * POINTS.completion + r.proposals * POINTS.proposal,
    }));

  const ranking = entries
    .filter((e) => e.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.completions - a.completions ||
        b.scans - a.scans ||
        b.owned - a.owned ||
        a.user.username.localeCompare(b.user.username)
    );
  ranking.forEach((e, i) => {
    e.rank = i > 0 && ranking[i - 1].points === e.points ? ranking[i - 1].rank : i + 1;
  });

  const board = (key) =>
    entries
      .filter((e) => e[key] > 0)
      .sort(byValueThenName(key))
      .slice(0, BOARD_SIZE)
      .map((e) => ({ user: e.user, value: e[key] }));

  const sum = (key) => entries.reduce((s, e) => s + e[key], 0);
  return {
    ranking,
    boards: {
      collectors: board("owned"),
      contributors: board("scans"),
      completers: board("completions"),
      traders: board("trades"),
    },
    stats: {
      members: ranking.length,
      cards: sum("owned"),
      scans: sum("scans"),
      completions: sum("completions"),
      // Chaque échange compte pour ses deux participants.
      trades: Math.round(sum("trades") / 2),
    },
  };
}

// Collections complétées par membre (pseudo), sur la période, d'après le palmarès.
export function completionsFromPalmares(palmares, since) {
  const counts = new Map();
  for (const item of palmares?.done || []) {
    for (const c of item.completed) {
      if (since && new Date(c.completedAt) < since) continue;
      counts.set(c.user.username, (counts.get(c.user.username) || 0) + 1);
    }
  }
  return counts;
}

export async function loadLeaderboard(period) {
  const since = periodSince(period);
  const from = since || new Date(0);
  const [owned, scans, proposals, trades, palmares] = await Promise.all([
    prisma.$queryRaw`
      SELECT "userId", COUNT(*)::int AS n FROM "UserCard"
      WHERE status = 'owned' AND "createdAt" >= ${from} GROUP BY "userId"`,
    prisma.$queryRaw`
      SELECT "userId", COUNT(*)::int AS n FROM "CardSubmission"
      WHERE status = 'approved' AND COALESCE("reviewedAt", "createdAt") >= ${from} GROUP BY "userId"`,
    prisma.$queryRaw`
      SELECT "userId", COUNT(*)::int AS n FROM "CollectionSubmission"
      WHERE status = 'approved' AND COALESCE("reviewedAt", "updatedAt") >= ${from} GROUP BY "userId"`,
    prisma.$queryRaw`
      SELECT x.uid AS "userId", COUNT(*)::int AS n FROM (
        SELECT "proposerId" AS uid, "closedAt" FROM "Trade" WHERE status = 'completed'
        UNION ALL
        SELECT "recipientId" AS uid, "closedAt" FROM "Trade" WHERE status = 'completed'
      ) x
      WHERE COALESCE(x."closedAt", ${from}) >= ${from} GROUP BY x.uid`,
    getPalmares(),
  ]);

  const completions = completionsFromPalmares(palmares, since);
  const ids = [...new Set([...owned, ...scans, ...proposals, ...trades].map((r) => r.userId))];
  const names = [...completions.keys()];
  const found =
    ids.length || names.length
      ? await prisma.user.findMany({
          where: { OR: [{ id: { in: ids } }, { username: { in: names } }] },
          select: { id: true, username: true, avatar: true },
        })
      : [];
  const users = new Map(found.map((u) => [u.id, { username: u.username, avatar: u.avatar }]));

  return { period, palmares, ...buildLeaderboard({ owned, scans, proposals, trades, completions, users }) };
}

// Ligne publique du classement (sans l'identifiant interne du membre).
export function publicEntry(e) {
  return {
    rank: e.rank,
    user: e.user,
    points: e.points,
    owned: e.owned,
    scans: e.scans,
    proposals: e.proposals,
    completions: e.completions,
  };
}
