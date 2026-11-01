import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveUserSession } from "@/lib/currentUser";

// « Mes envois » : les scans proposés par le membre connecté, du plus récent au plus ancien,
// avec leur étape (en examen, validé, en ligne, refusé), et ses propositions de collection.
export async function GET(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const [scans, collections] = await Promise.all([
      prisma.cardSubmission.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true, status: true, createdAt: true, publishedAt: true, image: true, numero: true, rarete: true,
          collection: { select: { nom: true } },
          card: { select: { id: true, numero: true, rarete: true, collection: { select: { nom: true } }, personnagePrincipal: { select: { name: true } } } },
        },
      }),
      prisma.collectionSubmission.findMany({
        where: { userId: session.sub },
        orderBy: { updatedAt: "desc" },
        select: { id: true, nom: true, status: true, updatedAt: true, _count: { select: { cards: true } } },
      }),
    ]);
    return NextResponse.json({ scans, collections }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Erreur GET /api/users/me/submissions :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
