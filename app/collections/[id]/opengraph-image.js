import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { naturalSortByNumero } from "@/lib/naturalSort";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: { cards: { select: { numero: true, image: true } } },
  });

  if (!collection) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#141f38", color: "#eef2fa", fontSize: 48, fontFamily: "sans-serif" }}>
          DB Non-Off 90's
        </div>
      ),
      { ...size }
    );
  }

  const sorted = [...collection.cards].sort(naturalSortByNumero);
  const preview = sorted.find((c) => c.image)?.image || collection.cover || null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#141f38", fontFamily: "sans-serif" }}>
        <div style={{ width: 440, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1730" }}>
          {preview ? (
            <img
              src={preview}
              width={340}
              height={476}
              style={{ objectFit: "cover", border: "5px solid #f2711c" }}
            />
          ) : (
            <div style={{ display: "flex", fontSize: 90 }}>🐉</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px" }}>
          <div style={{ display: "flex", fontSize: 22, color: "#e0b04a", textTransform: "uppercase", letterSpacing: 4 }}>
            DB Non-Off 90's
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 900, color: "#eef2fa", marginTop: 18, lineHeight: 1.15 }}>
            {collection.nom}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#8ea3c4", marginTop: 14 }}>
            {[collection.pays, collection.annee].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
