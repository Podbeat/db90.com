import { NextResponse } from "next/server";
import { resolveUserSession } from "@/lib/currentUser";
import { checkUserRateLimit } from "@/lib/rateLimit";
import { getPresignedUploadUrl } from "@/lib/storage";
import { ORIGINALS_PREFIX, ORIGINAL_TYPES, ORIGINAL_MAX_BYTES } from "@/lib/originals";

export const runtime = "nodejs";

// Prépare l'envoi direct au stockage du scan ORIGINAL d'un membre (pleine définition, non
// recadré), que l'admin pourra télécharger et retoucher. Le fichier ne transite pas par
// cette fonction : seule une adresse d'envoi signée, valable 5 minutes, est renvoyée.
export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    const { filename, contentType, size } = await request.json().catch(() => ({}));
    if (!ORIGINAL_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Format non pris en charge : envoie un fichier JPG, PNG ou WebP." }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > ORIGINAL_MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop lourd : 40 Mo au maximum." }, { status: 400 });
    }
    const allowed = await checkUserRateLimit(session.sub, "original-upload", { maxAttempts: 60, windowMs: 60 * 60 * 1000 });
    if (!allowed) return NextResponse.json({ error: "Trop d'envois en peu de temps. Réessaie dans un moment." }, { status: 429 });
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename || "scan.jpg", contentType, { prefix: ORIGINALS_PREFIX });
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (e) {
    console.error("Erreur POST /api/submissions/presign :", e);
    return NextResponse.json({ error: "Envoi de l'original indisponible pour le moment." }, { status: 500 });
  }
}
