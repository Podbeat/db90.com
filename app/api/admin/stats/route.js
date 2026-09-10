import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function dayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalPageViews, totalHDDownloads, last30Events, allTimeVisitors] = await Promise.all([
      prisma.analyticsEvent.count({ where: { type: "page_view" } }),
      prisma.analyticsEvent.count({ where: { type: "hd_download" } }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since30 } },
        select: { type: true, path: true, country: true, visitorId: true, createdAt: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { type: "page_view", visitorId: { not: null } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
    ]);

    const pageViews30 = last30Events.filter((e) => e.type === "page_view");
    const pageViews7 = pageViews30.filter((e) => e.createdAt >= since7);

    // Évolution jour par jour sur les 30 derniers jours (y compris les jours à 0 vue)
    const dailyMap = new Map();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyMap.set(dayKey(d), 0);
    }
    for (const e of pageViews30) {
      const k = dayKey(e.createdAt);
      if (dailyMap.has(k)) dailyMap.set(k, dailyMap.get(k) + 1);
    }
    const daily = Array.from(dailyMap.entries()).map(([date, views]) => ({ date, views }));

    // Répartition par pays (sur les 30 derniers jours)
    const countryCounts = {};
    for (const e of pageViews30) {
      const c = e.country || "Inconnu";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    }
    const byCountry = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // Pages les plus consultées (sur les 30 derniers jours)
    const pathCounts = {};
    for (const e of pageViews30) {
      const p = e.path || "?";
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    }
    const topPages = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const uniqueVisitors30 = new Set(pageViews30.map((e) => e.visitorId).filter(Boolean)).size;

    return NextResponse.json({
      totals: {
        pageViews: totalPageViews,
        hdDownloads: totalHDDownloads,
        uniqueVisitorsAllTime: allTimeVisitors.length,
      },
      last7Days: { pageViews: pageViews7.length },
      last30Days: { pageViews: pageViews30.length, uniqueVisitors: uniqueVisitors30 },
      daily,
      byCountry,
      topPages,
    });
  } catch (e) {
    console.error("Erreur GET /api/admin/stats :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
