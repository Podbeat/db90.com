import { NextResponse } from "next/server";
import { resolveUserSession } from "@/lib/currentUser";
import { loadLeaderboard, normalizePeriod } from "@/lib/leaderboard";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Position du membre connecté dans le classement (?periode=tout|30j) : son rang, ses points
// et le membre juste devant lui. Jamais mis en cache : la réponse dépend du visiteur.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });

    const period = normalizePeriod(new URL(request.url).searchParams.get("periode"));
    const { ranking } = await loadLeaderboard(period);
    const i = ranking.findIndex((e) => e.userId === session.sub);
    if (i === -1) return NextResponse.json({ rank: null, points: 0, totalRanked: ranking.length }, { headers: NO_STORE });

    const me = ranking[i];
    let ahead = null;
    for (let j = i - 1; j >= 0; j--) {
      if (ranking[j].points > me.points) {
        ahead = { username: ranking[j].user.username, points: ranking[j].points };
        break;
      }
    }
    return NextResponse.json({ rank: me.rank, points: me.points, totalRanked: ranking.length, ahead }, { headers: NO_STORE });
  } catch (e) {
    console.error("Erreur GET /api/leaderboard/me :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500, headers: NO_STORE });
  }
}
