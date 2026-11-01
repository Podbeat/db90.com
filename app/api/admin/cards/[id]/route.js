import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Mise à jour partielle d'une carte depuis l'atelier d'intégration : seulement le scan
// (image et image HD) et/ou le personnage principal. Les autres champs ne changent pas.
const STORAGE_PREFIX = "https://";

export async function PATCH(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data = {};
    if (body.image !== undefined) {
      if (typeof body.image !== "string" || !body.image.startsWith(STORAGE_PREFIX)) return NextResponse.json({ error: "Image invalide." }, { status: 400 });
      data.image = body.image;
      data.imageHD = typeof body.imageHD === "string" && body.imageHD.startsWith(STORAGE_PREFIX) ? body.imageHD : null;
    }
    if (body.personnagePrincipalId !== undefined) {
      const charId = body.personnagePrincipalId || null;
      if (charId && !(await prisma.character.findUnique({ where: { id: charId }, select: { id: true } }))) {
        return NextResponse.json({ error: "Personnage inconnu." }, { status: 400 });
      }
      data.personnagePrincipalId = charId;
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
    const exists = await prisma.card.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
    const card = await prisma.card.update({
      where: { id },
      data,
      select: { id: true, numero: true, image: true, imageHD: true, personnagePrincipalId: true, personnagePrincipal: { select: { id: true, name: true } } },
    });
    return NextResponse.json(card);
  } catch (e) {
    console.error("Erreur PATCH /api/admin/cards/[id] :", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
