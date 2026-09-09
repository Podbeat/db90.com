import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { display, hd } = await saveImage(buffer, file.name);
  return NextResponse.json({ url: display, hdUrl: hd });
}
