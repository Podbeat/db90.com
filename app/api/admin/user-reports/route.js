import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const reports = await prisma.userReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reportedUser: { select: { username: true, email: true } },
        reporterUser: { select: { username: true } },
      },
    });
    return NextResponse.json(reports);
  } catch (e) {
    console.error("Erreur GET /api/admin/user-reports :", e);
    return NextResponse.json({ error: `Erreur serveur.` }, { status: 500 });
  }
}
