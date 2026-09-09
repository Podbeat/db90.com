import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json();
  const report = await prisma.report.update({
    where: { id: params.id },
    data: { status: body.status },
  });
  return NextResponse.json(report);
}

export async function DELETE(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
