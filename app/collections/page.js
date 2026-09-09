import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { annee: "asc" },
    include: { _count: { select: { cards: true } } },
  });

  return (
    <div className="container page">
      <h1 className="display-font" style={{ fontSize: "1.4rem", marginBottom: "1.25rem" }}>Collections</h1>
      {collections.length === 0 ? (
        <div className="empty-state">Aucune collection archivée pour l'instant.</div>
      ) : (
        <div className="collection-grid">
          {collections.map((col) => {
            const archived = col._count.cards;
            const pct = col.total ? Math.min(100, Math.round((archived / col.total) * 100)) : 0;
            return (
              <Link key={col.id} href={`/collections/${col.id}`} className="collection-tile">
                <div className="display-font" style={{ fontSize: "0.95rem" }}>{col.nom}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                  {[col.editeur, col.pays, col.annee].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontSize: "0.75rem", marginTop: "0.7rem" }}>
                  {archived} / {col.total || "?"} cartes archivées
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
