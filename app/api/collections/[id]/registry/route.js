import { NextResponse } from "next/server";
import { getCollectionRegistry } from "@/lib/registry";
import { publicCacheHeaders } from "@/lib/httpCache";

// Registre public d'une collection : palmarès (membres l'ayant complétée, dans l'ordre
// d'arrivée) et classement des autres collectionneurs. Mis en cache une minute sur le CDN ;
// la page replace le membre connecté avec son propre compte à jour (lib/registryRank.js).
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const registry = await getCollectionRegistry(id);
    if (!registry) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    return NextResponse.json(registry, { headers: publicCacheHeaders(request) });
  } catch (e) {
    console.error("Erreur GET /api/collections/[id]/registry :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
