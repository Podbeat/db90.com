import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { id } = await params;
    const { status } = await request.json();
    const report = await prisma.userReport.update({ where: { id }, data: { status } });
    return NextResponse.json(report);
  } catch (e) {
    console.error("Erreur PUT /api/admin/user-reports/[id] :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
