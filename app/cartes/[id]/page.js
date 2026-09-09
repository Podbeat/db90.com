import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ReportError from "@/components/ReportError";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const card = await prisma.card.findUnique({ where: { id: params.id }, include: { collection: true } });
  if (!card) return {};
  return {
    title: `${card.personnage} — ${card.numero} — ${card.collection.nom} | Archives Carddass`,
    description: `Fiche de référence pour la carte ${card.numero} (${card.collection.nom}, ${card.rarete}) — ${card.personnage}.`,
  };
}

export default async function CardDetailPage({ params }) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: { collection: true },
  });

  if (!card) notFound();

  const image =
    card.image ||
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'><rect width='240' height='336' fill='#2a2216'/><text x='120' y='170' font-family='Arial' font-size='16' fill='#a89c86' text-anchor='middle'>${card.numero}</text></svg>`
    )}`;

  return (
    <div className="container page">
      <Link href={`/collections/${card.collectionId}`} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
        ← {card.collection.nom}
      </Link>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
        <div style={{ width: 280 }}>
          <img src={image} alt={card.personnage} style={{ width: "100%", border: "1px solid var(--line)" }} />
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>Recto</div>
          {card.imageHD && (
            <a
              href={card.imageHD}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}
            >
              Voir le scan en haute définition ↗
            </a>
          )}
        </div>
        {card.collection.dos && (
          <div style={{ width: 280 }}>
            <img src={card.collection.dos} alt={`Dos — ${card.collection.nom}`} style={{ width: "100%", border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.4rem" }}>
              Verso (commun à la série)
            </div>
            {card.collection.dosHD && (
              <a
                href={card.collection.dosHD}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", marginTop: "0.2rem", fontSize: "0.78rem", color: "var(--gold)", textAlign: "center" }}
              >
                Voir le scan en haute définition ↗
              </a>
            )}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>{card.personnage}</h1>
          <div className="data-row"><span className="data-label">Collection</span><span>{card.collection.nom}</span></div>
          <div className="data-row"><span className="data-label">Référence</span><span>{card.numero}</span></div>
          <div className="data-row"><span className="data-label">Variante / rareté</span><span>{card.rarete}</span></div>
          <div className="data-row"><span className="data-label">Origine</span><span>{card.collection.pays || "—"}</span></div>
          <div className="data-row"><span className="data-label">Année</span><span>{card.collection.annee || "—"}</span></div>
          {card.description && (
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>{card.description}</p>
          )}
          <ReportError cardId={card.id} />
        </div>
      </div>
    </div>
  );
}
