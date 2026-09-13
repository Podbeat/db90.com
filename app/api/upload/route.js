import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { processDisplayImage } from "@/lib/storage";

export const runtime = "nodejs";

// Ne traite désormais QUE la version d'affichage (redimensionnée + filigrane optionnel).
// Le fichier HD original est envoyé directement au stockage par le navigateur via une URL
// signée (voir /api/upload/presign), pour ne jamais dépasser la limite de taille de requête
// de la fonction serveur avec un scan haute définition.
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
    const watermark = formData.get("watermark") !== "false";
    const { display } = await processDisplayImage(buffer, file.name, { watermark });
    return NextResponse.json({ url: display });
  } catch (e) {
    console.error("Erreur POST /api/upload :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
