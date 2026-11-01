import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Effets / prismes (administration) : la liste avec le nombre de cartes qui utilisent chacun,
// et l'ajout d'un effet.
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const [effects, usage, toDefine] = await Promise.all([
      prisma.effect.findMany({ select: { id: true, name: true } }),
      prisma.card.groupBy({ by: ["rarete"], _count: { _all: true } }),
      prisma.card.count({ where: { rarete: null } }),
    ]);
    const countByName = new Map(usage.filter((u) => u.rarete).map((u) => [u.rarete, u._count._all]));
    const list = effects
      .map((e) => ({ ...e, cards: countByName.get(e.name) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    // Effets encore présents sur des cartes mais absents de la liste (anciennes saisies libres).
    const listed = new Set(effects.map((e) => e.name));
    const unlisted = [...countByName.entries()].filter(([name]) => !listed.has(name)).map(([name, cards]) => ({ name, cards }));
    return NextResponse.json({ effects: list, unlisted, toDefine });
  } catch (e) {
    console.error("Erreur GET /api/admin/effects :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { name } = await request.json();
    const trimmed = (name || "").trim();
    if (!trimmed) return NextResponse.json({ error: "Nom manquant." }, { status: 400 });
    if (trimmed.length > 60) return NextResponse.json({ error: "Nom trop long (60 caractères au plus)." }, { status: 400 });

    const existing = await prisma.effect.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } });
    if (existing) return NextResponse.json({ error: `« ${existing.name} » existe déjà.` }, { status: 409 });

    const effect = await prisma.effect.create({ data: { name: trimmed }, select: { id: true, name: true } });
    return NextResponse.json({ ...effect, cards: 0 }, { status: 201 });
  } catch (e) {
    console.error("Erreur POST /api/admin/effects :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
