import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function dayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function weekKey(date) {
  // Clé ISO année-semaine, ex. 2026-W37
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

function monthKey(date) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

// Périodes proposées, avec le pas d'agrégation utilisé pour le graphique
const PERIODS = {
  "30d": { days: 30, bucket: "day", label: "30 derniers jours" },
  "90d": { days: 90, bucket: "week", label: "3 derniers mois" },
  "365d": { days: 365, bucket: "month", label: "12 derniers mois" },
};

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const periodKey = PERIODS[searchParams.get("period")] ? searchParams.get("period") : "30d";
    const period = PERIODS[periodKey];

    const now = new Date();
    const sincePeriod = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalPageViews, totalHDDownloads, periodEvents, allTimeVisitors, totalUsers, signupsPeriod] = await Promise.all([
      prisma.analyticsEvent.count({ where: { type: "page_view" } }),
      prisma.analyticsEvent.count({ where: { type: "hd_download" } }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: sincePeriod } },
        select: { type: true, path: true, country: true, visitorId: true, createdAt: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { type: "page_view", visitorId: { not: null } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.user.count(),
      prisma.user.findMany({ where: { createdAt: { gte: sincePeriod } }, select: { createdAt: true } }),
    ]);

    const pageViewsPeriod = periodEvents.filter((e) => e.type === "page_view");
    const pageViews7 = pageViewsPeriod.filter((e) => e.createdAt >= since7);
    const pageViews30 = pageViewsPeriod.filter((e) => e.createdAt >= since30);

    // Évolution sur la période choisie, avec un pas adapté (jour / semaine / mois)
    // afin que le graphique reste lisible sur 30 jours comme sur 1 an. On garde un Set de
    // visiteurs par case pour pouvoir aussi tracer les visiteurs uniques, pas seulement
    // le nombre de vues.
    const keyFn = period.bucket === "day" ? dayKey : period.bucket === "week" ? weekKey : monthKey;
    const bucketMap = new Map();
    const stepMs = period.bucket === "day" ? 24 * 60 * 60 * 1000 : period.bucket === "week" ? 7 * 24 * 60 * 60 * 1000 : null;
    function ensureBucket(k) {
      if (!bucketMap.has(k)) bucketMap.set(k, { views: 0, visitors: new Set(), signups: 0 });
      return bucketMap.get(k);
    }
    if (stepMs) {
      const steps = Math.ceil(period.days * 24 * 60 * 60 * 1000 / stepMs);
      for (let i = steps - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * stepMs);
        ensureBucket(keyFn(d));
      }
    } else {
      // pas mensuel : on énumère les 12 (ou N) mois calendaires couverts
      const months = Math.ceil(period.days / 30) + 1;
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        ensureBucket(monthKey(d));
      }
    }
    for (const e of pageViewsPeriod) {
      const bucket = ensureBucket(keyFn(e.createdAt));
      bucket.views += 1;
      if (e.visitorId) bucket.visitors.add(e.visitorId);
    }
    for (const u of signupsPeriod) {
      const bucket = ensureBucket(keyFn(u.createdAt));
      bucket.signups += 1;
    }
    const daily = Array.from(bucketMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, b]) => ({ date, views: b.views, uniqueVisitors: b.visitors.size, signups: b.signups }));

    // Répartition par pays (sur la période choisie)
    const countryCounts = {};
    for (const e of pageViewsPeriod) {
      const c = e.country || "Inconnu";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    }
    const byCountry = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // Pages les plus consultées (sur la période choisie)
    const pathCounts = {};
    for (const e of pageViewsPeriod) {
      const p = e.path || "?";
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    }
    const topPages = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const uniqueVisitorsPeriod = new Set(pageViewsPeriod.map((e) => e.visitorId).filter(Boolean)).size;

    return NextResponse.json({
      period: periodKey,
      periodLabel: period.label,
      bucket: period.bucket,
      totals: {
        pageViews: totalPageViews,
        hdDownloads: totalHDDownloads,
        uniqueVisitorsAllTime: allTimeVisitors.length,
        users: totalUsers,
      },
      last7Days: { pageViews: pageViews7.length },
      last30Days: { pageViews: pageViews30.length },
      periodStats: { pageViews: pageViewsPeriod.length, uniqueVisitors: uniqueVisitorsPeriod, signups: signupsPeriod.length },
      daily,
      byCountry,
      topPages,
    });
  } catch (e) {
    console.error("Erreur GET /api/admin/stats :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
