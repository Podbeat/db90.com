import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

// Renvoie une URL signée permettant au navigateur d'envoyer le fichier ORIGINAL directement
// au stockage, sans jamais transiter par cette fonction serveur — contourne la limite de
// taille de requête de la plateforme d'hébergement (quelques Mo), qu'un scan haute définition
// dépasse facilement.
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

    const { filename, contentType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "Nom de fichier manquant." }, { status: 400 });
    }

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename, contentType);
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (e) {
    console.error("Erreur POST /api/upload/presign :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
