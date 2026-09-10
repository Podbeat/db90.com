import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const watermark = formData.get("watermark") !== "false"; // true par défaut si absent
    const { display, hd } = await saveImage(buffer, file.name, { watermark });
    return NextResponse.json({ url: display, hdUrl: hd });
  } catch (e) {
    console.error("Erreur POST /api/upload :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
