import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const where = status === "all" ? {} : { status };

    const submissions = await prisma.collectionSubmission.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { username: true, avatar: true } },
        _count: { select: { cards: true } },
      },
    });

    return NextResponse.json(submissions);
  } catch (e) {
    console.error("Erreur GET /api/admin/collection-submissions :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
