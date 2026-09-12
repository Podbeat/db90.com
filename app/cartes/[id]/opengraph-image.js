import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Convention de fichier Next.js : sa seule présence dans ce dossier de route suffit à
// générer et référencer automatiquement l'image Open Graph de la fiche carte (pas besoin
// de la déclarer manuellement dans generateMetadata).
export default async function Image({ params }) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: { collection: { select: { nom: true } } },
  });

  if (!card) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#141f38", color: "#eef2fa", fontSize: 48, fontFamily: "sans-serif" }}>
          DB Non-Off 90's
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#141f38", fontFamily: "sans-serif" }}>
        <div style={{ width: 440, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1730" }}>
          {card.image ? (
            <img
              src={card.image}
              width={340}
              height={476}
              style={{ objectFit: "cover", border: "5px solid #f2711c" }}
            />
          ) : (
            <div style={{ display: "flex", fontSize: 90 }}>🔍</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px" }}>
          <div style={{ display: "flex", fontSize: 22, color: "#e0b04a", textTransform: "uppercase", letterSpacing: 4 }}>
            DB Non-Off 90's
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 900, color: "#eef2fa", marginTop: 18, lineHeight: 1.1 }}>
            {card.personnage}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#8ea3c4", marginTop: 14 }}>
            {card.collection.nom} — n°{card.numero}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
