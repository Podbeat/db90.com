import { NextResponse } from "next/server";
import { publicCacheHeaders } from "@/lib/httpCache";
import { loadLeaderboard, normalizePeriod, publicEntry, LEADERBOARD_PAGE_SIZE, POINTS } from "@/lib/leaderboard";

// Classement public : classement général par points (?periode=tout|30j, ?depuis=50 pour la
// suite), meilleurs par catégorie, chiffres de la communauté et palmarès des collections.
// Identique pour tous les visiteurs, donc mis en cache par le CDN ; la position du membre
// connecté est servie à part par /api/leaderboard/me.
export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const period = normalizePeriod(params.get("periode"));
    const offset = Math.min(Math.max(parseInt(params.get("depuis"), 10) || 0, 0), 100000);
    const data = await loadLeaderboard(period);

    return NextResponse.json(
      {
        period,
        offset,
        pageSize: LEADERBOARD_PAGE_SIZE,
        totalRanked: data.ranking.length,
        ranking: data.ranking.slice(offset, offset + LEADERBOARD_PAGE_SIZE).map(publicEntry),
        // Le reste ne sert qu'au premier affichage de la page.
        ...(offset === 0 && { stats: data.stats, boards: data.boards, palmares: data.palmares, points: POINTS }),
      },
      { headers: publicCacheHeaders(request) }
    );
  } catch (e) {
    console.error("Erreur GET /api/leaderboard :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
