import { NextResponse } from "next/server";
import { resolveUserSession } from "@/lib/currentUser";
import { computeParticipation } from "@/lib/participation";

export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const participation = await computeParticipation(session.sub);
    return NextResponse.json(participation);
  } catch (e) {
    console.error("Erreur GET /api/users/me/participation :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
