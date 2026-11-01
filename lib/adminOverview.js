import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";

// Données du tableau de bord de l'administration : ce qui attend une décision, l'audience
// des 14 derniers jours, les membres, l'état du catalogue et l'activité récente. Les textes
// sont en français (l'administration n'est pas traduite).

const DAY = 24 * 60 * 60 * 1000;
const QUEUE_SIZE = 8;
const ACTIVITY_SIZE = 10;
const TODO_EXAMPLES = 5;

const excerpt = (text, max = 110) => {
  const s = (text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
const cardLabel = (collectionName, numero) => [collectionName, numero ? `n°${numero}` : null].filter(Boolean).join(" ");

// Jour (AAAA-MM-JJ) à l'heure de Paris.
const parisDay = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);

// Éléments en attente d'une décision, par type : menu latéral et tableau de bord.
export async function getPendingCounts() {
  const [scans, collectionProposals, cardReports, userReports] = await Promise.all([
    prisma.cardSubmission.count({ where: { status: "pending" } }),
    prisma.collectionSubmission.count({ where: { status: "pending" } }),
    prisma.report.count({ where: { status: "nouveau" } }),
    prisma.userReport.count({ where: { status: "nouveau" } }),
  ]);
  return { scans, collectionProposals, cardReports, userReports, total: scans + collectionProposals + cardReports + userReports };
}

// File « À traiter » : les plus récents de chaque type, mélangés par date.
async function pendingQueue() {
  const [scans, proposals, reports, userReports] = await Promise.all([
    prisma.cardSubmission.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: QUEUE_SIZE,
      select: {
        id: true, createdAt: true, image: true, numero: true, rarete: true,
        user: { select: { username: true } },
        collection: { select: { nom: true } },
        card: { select: { numero: true, image: true, collection: { select: { nom: true } } } },
      },
    }),
    prisma.collectionSubmission.findMany({
      where: { status: "pending" },
      orderBy: { updatedAt: "desc" },
      take: QUEUE_SIZE,
      select: { id: true, nom: true, updatedAt: true, user: { select: { username: true } }, _count: { select: { cards: true } } },
    }),
    prisma.report.findMany({
      where: { status: "nouveau" },
      orderBy: { createdAt: "desc" },
      take: QUEUE_SIZE,
      select: { id: true, message: true, createdAt: true, card: { select: { numero: true, image: true, collection: { select: { nom: true } } } } },
    }),
    prisma.userReport.findMany({
      where: { status: "nouveau" },
      orderBy: { createdAt: "desc" },
      take: QUEUE_SIZE,
      select: { id: true, message: true, createdAt: true, reportedUser: { select: { username: true } }, reporterUser: { select: { username: true } } },
    }),
  ]);

  const items = [
    ...scans.map((s) => ({
      type: "scan",
      id: s.id,
      date: s.createdAt,
      image: s.image,
      by: s.user?.username || null,
      title: s.card ? cardLabel(s.card.collection?.nom, s.card.numero) : cardLabel(s.collection?.nom, s.numero),
      detail: s.card ? (s.card.image ? "Remplacerait le visuel actuel" : "Carte encore sans visuel") : `Nouvel effet « ${s.rarete || "?"} »`,
      href: "/admin/moderation?type=scan",
    })),
    ...proposals.map((p) => ({
      type: "collection",
      id: p.id,
      date: p.updatedAt,
      by: p.user?.username || null,
      title: p.nom,
      detail: `${p._count.cards} carte${p._count.cards > 1 ? "s" : ""} proposée${p._count.cards > 1 ? "s" : ""}`,
      href: "/admin/moderation?type=collection",
    })),
    ...reports.map((r) => ({
      type: "card_report",
      id: r.id,
      date: r.createdAt,
      image: r.card?.image || null,
      by: null,
      title: cardLabel(r.card?.collection?.nom, r.card?.numero),
      detail: excerpt(r.message),
      href: "/admin/moderation?type=card_report",
    })),
    ...userReports.map((r) => ({
      type: "user_report",
      id: r.id,
      date: r.createdAt,
      by: r.reporterUser?.username || null,
      title: r.reportedUser?.username || "Membre supprimé",
      detail: excerpt(r.message),
      href: "/admin/moderation?type=user_report",
    })),
  ];
  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, QUEUE_SIZE);
}

// Audience des 14 derniers jours (heure de Paris), comparée à la semaine précédente.
async function audience(now) {
  const [daily, totals, topPages, countries] = await Promise.all([
    prisma.$queryRaw`
      SELECT to_char(date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris'), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "AnalyticsEvent"
      WHERE type = 'page_view' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '15 days'
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days')::int AS "views7",
        COUNT(*) FILTER (WHERE "createdAt" < (now() AT TIME ZONE 'UTC') - interval '7 days')::int AS "viewsPrev7",
        COUNT(DISTINCT "visitorId") FILTER (WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days')::int AS "visitors7",
        COUNT(DISTINCT "visitorId") FILTER (WHERE "createdAt" < (now() AT TIME ZONE 'UTC') - interval '7 days')::int AS "visitorsPrev7"
      FROM "AnalyticsEvent"
      WHERE type = 'page_view' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '14 days'`,
    prisma.$queryRaw`
      SELECT COALESCE(path, '?') AS path, COUNT(*)::int AS views
      FROM "AnalyticsEvent"
      WHERE type = 'page_view' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
    prisma.$queryRaw`
      SELECT COALESCE(country, '?') AS country, COUNT(*)::int AS views
      FROM "AnalyticsEvent"
      WHERE type = 'page_view' AND "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
  ]);
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = parisDay(new Date(now.getTime() - (13 - i) * DAY));
    const row = byDay.get(day);
    return { day, views: row ? Number(row.views) : 0, visitors: row ? Number(row.visitors) : 0 };
  });
  const t = totals[0] || {};
  return {
    days,
    views7: Number(t.views7 || 0),
    viewsPrev7: Number(t.viewsPrev7 || 0),
    visitors7: Number(t.visitors7 || 0),
    visitorsPrev7: Number(t.visitorsPrev7 || 0),
    topPages: topPages.map((p) => ({ path: p.path, views: Number(p.views) })),
    countries: countries.map((c) => ({ country: c.country, views: Number(c.views) })),
  };
}

// Catalogue : chiffres, ce qui reste à compléter, et avancement de chaque collection.
async function catalogue(since30) {
  const [cardRows, collections, characters, cards30] = await Promise.all([
    prisma.card.findMany({
      select: { id: true, collectionId: true, numero: true, image: true, personnagePrincipalId: true, collection: { select: { nom: true } } },
    }),
    prisma.collection.findMany({ select: { id: true, nom: true, total: true, cover: true, dos: true }, orderBy: { nom: "asc" } }),
    prisma.character.count(),
    prisma.card.count({ where: { createdAt: { gte: since30 } } }),
  ]);

  const byCollection = new Map(collections.map((c) => [c.id, { refs: new Set(), cards: [], missingScans: 0 }]));
  for (const card of cardRows) {
    const entry = byCollection.get(card.collectionId);
    if (!entry) continue;
    entry.refs.add(card.numero);
    entry.cards.push(card);
    if (!card.image) entry.missingScans += 1;
  }
  const archive = collections.map((col) => {
    const entry = byCollection.get(col.id);
    const first = entry.cards.filter((c) => c.image).sort(naturalSortByNumero)[0];
    return {
      id: col.id,
      nom: col.nom,
      total: col.total,
      references: entry.refs.size,
      cards: entry.cards.length,
      missingScans: entry.missingScans,
      preview: first?.image || col.cover || null,
    };
  });

  const asCard = (c) => ({ id: c.id, label: cardLabel(c.collection?.nom, c.numero) });
  const withoutImage = cardRows.filter((c) => !c.image).sort(naturalSortByNumero);
  const withoutCharacter = cardRows.filter((c) => !c.personnagePrincipalId).sort(naturalSortByNumero);
  const withoutTotal = collections.filter((c) => !c.total);
  const withoutBack = collections.filter((c) => !c.dos);
  return {
    summary: { cards: cardRows.length, collections: collections.length, characters, cards30 },
    todo: {
      withoutImage: { count: withoutImage.length, examples: withoutImage.slice(0, TODO_EXAMPLES).map(asCard) },
      withoutCharacter: { count: withoutCharacter.length, examples: withoutCharacter.slice(0, TODO_EXAMPLES).map(asCard) },
      withoutTotal: { count: withoutTotal.length, examples: withoutTotal.slice(0, TODO_EXAMPLES).map((c) => ({ id: c.id, label: c.nom })) },
      withoutBack: { count: withoutBack.length, examples: withoutBack.slice(0, TODO_EXAMPLES).map((c) => ({ id: c.id, label: c.nom })) },
    },
    archive,
  };
}

// Membres et activité de la communauté sur 30 jours.
async function community(since30) {
  const [total, new30, unverified, activeRows, checked30, messages30, listings, openTrades, completedTrades] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.count({ where: { emailVerified: false } }),
    prisma.userCard.groupBy({ by: ["userId"], where: { createdAt: { gte: since30 } } }),
    prisma.userCard.count({ where: { createdAt: { gte: since30 } } }),
    prisma.message.count({ where: { createdAt: { gte: since30 } } }),
    prisma.cardListing.count(),
    prisma.trade.count({ where: { status: { in: ["proposed", "accepted"] } } }),
    prisma.trade.count({ where: { status: "completed" } }),
  ]);
  return {
    members: { total, new30, unverified, active30: activeRows.length },
    activity: { checked30, messages30, listings, openTrades, completedTrades },
  };
}

// Fil des derniers événements : inscriptions, scans validés, collections complétées, mises
// en vente, échanges et avis.
async function recentActivity() {
  const [signups, events, trades, ratings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { username: true, createdAt: true } }),
    prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        type: true, createdAt: true,
        user: { select: { username: true } },
        card: { select: { numero: true, collection: { select: { nom: true } } } },
        collection: { select: { nom: true } },
      },
    }),
    prisma.trade.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { status: true, createdAt: true, closedAt: true, proposer: { select: { username: true } }, recipient: { select: { username: true } } },
    }),
    prisma.userRating.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { positive: true, createdAt: true, rater: { select: { username: true } }, target: { select: { username: true } } },
    }),
  ]);

  const items = [
    ...signups.map((u) => ({ type: "signup", date: u.createdAt, actor: u.username, text: "a rejoint le site" })),
    ...events.map((e) => {
      const card = cardLabel(e.card?.collection?.nom, e.card?.numero);
      const text =
        e.type === "scan_approved" ? `a vu son scan validé : ${card}`
        : e.type === "collection_completed" ? `a complété la collection ${e.collection?.nom || ""}`
        : e.type === "card_for_sale" ? `met en vente ${card}`
        : "a été actif";
      return { type: e.type, date: e.createdAt, actor: e.user?.username || null, text };
    }),
    ...trades.map((tr) =>
      tr.status === "completed"
        ? { type: "trade", date: tr.closedAt || tr.createdAt, actor: tr.proposer?.username || null, text: `a terminé un échange avec ${tr.recipient?.username || "un membre"}` }
        : { type: "trade", date: tr.createdAt, actor: tr.proposer?.username || null, text: `propose un échange à ${tr.recipient?.username || "un membre"}` }
    ),
    ...ratings.map((r) => ({
      type: "rating",
      date: r.createdAt,
      actor: r.rater?.username || null,
      text: `a laissé un avis ${r.positive ? "positif" : "négatif"} à ${r.target?.username || "un membre"}`,
    })),
  ];
  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, ACTIVITY_SIZE);
}

export async function getAdminOverview(now = new Date()) {
  const since30 = new Date(now.getTime() - 30 * DAY);
  const [pending, queue, aud, cat, comm, activity] = await Promise.all([
    getPendingCounts(),
    pendingQueue(),
    audience(now),
    catalogue(since30),
    community(since30),
    recentActivity(),
  ]);
  return {
    generatedAt: now.toISOString(),
    pending,
    queue,
    audience: aud,
    catalogue: cat,
    members: comm.members,
    community: comm.activity,
    activity,
  };
}
