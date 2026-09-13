import { NextResponse } from "next/server";
import { resolveUserSession } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { processAvatarImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await resolveUserSession(request);
    if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await processAvatarImage(buffer, file.name);

    await prisma.user.update({ where: { id: session.sub }, data: { avatar: avatarUrl } });

    return NextResponse.json({ avatar: avatarUrl });
  } catch (e) {
    console.error("Erreur POST /api/users/me/avatar :", e);
    return NextResponse.json({ error: `Erreur serveur : ${e.message}` }, { status: 500 });
  }
}
