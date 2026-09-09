import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }) {
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: { cards: { orderBy: { numero: "asc" } } },
  });

  if (!collection) notFound();

  return (
    <div className="container page">
      <Link href="/collections" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>← Toutes les collections</Link>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start", margin: "0.6rem 0 1.5rem" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="display-font" style={{ fontSize: "1.4rem", margin: "0 0 0.2rem" }}>{collection.nom}</h1>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {[collection.editeur, collection.pays, collection.annee].filter(Boolean).join(" · ")}
            {" — "}
            {collection.total
              ? `${collection.cards.length} / ${collection.total} cartes archivées`
              : `${collection.cards.length} carte${collection.cards.length > 1 ? "s" : ""} archivée${collection.cards.length > 1 ? "s" : ""} · série en cours de complétion`}
          </div>
        </div>
        {collection.dos && (
          <div style={{ textAlign: "center" }}>
            <img src={collection.dos} alt={`Dos — ${collection.nom}`} style={{ width: 90, border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Dos de la série</div>
            {collection.dosHD && (
              <a href={collection.dosHD} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.68rem", color: "var(--gold)" }}>
                Voir en HD ↗
              </a>
            )}
          </div>
        )}
      </div>

      {collection.cards.length === 0 ? (
        <div className="empty-state">Aucune carte archivée dans cette collection pour l'instant.</div>
      ) : (
        <div className="card-grid">
          {collection.cards.map((c) => (
            <Link key={c.id} href={`/cartes/${c.id}`} className="card-tile">
              <img
                src={
                  c.image ||
                  `data:image/svg+xml;utf8,${encodeURIComponent(
                    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'><rect width='240' height='336' fill='#2a2216'/><text x='120' y='170' font-family='Arial' font-size='16' fill='#a89c86' text-anchor='middle'>${c.numero}</text></svg>`
                  )}`
                }
                alt={c.personnage}
              />
              <div className="meta">
                <div className="card-num">{c.numero}</div>
                <div className="card-nom">{c.personnage}</div>
                <span className="rarity-tag">{c.rarete}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
