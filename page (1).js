import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalCards, totalCollections, newReports] = await Promise.all([
    prisma.card.count(),
    prisma.collection.count(),
    prisma.report.count({ where: { status: "nouveau" } }),
  ]);

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "1.25rem" }}>Tableau de bord</h1>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <div className="filter-panel" style={{ minWidth: 180 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cartes archivées</div>
          <div className="display-font" style={{ fontSize: "1.8rem", marginTop: "0.3rem" }}>{totalCards}</div>
        </div>
        <div className="filter-panel" style={{ minWidth: 180 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Collections</div>
          <div className="display-font" style={{ fontSize: "1.8rem", marginTop: "0.3rem" }}>{totalCollections}</div>
        </div>
        <Link href="/admin/reports" className="filter-panel" style={{ minWidth: 180, display: "block" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Signalements en attente</div>
          <div className="display-font" style={{ fontSize: "1.8rem", marginTop: "0.3rem", color: newReports > 0 ? "var(--gold)" : "inherit" }}>
            {newReports}
          </div>
        </Link>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/admin/stats" className="btn-ghost">Voir les statistiques</Link>
        <Link href="/admin/cartes" className="btn-ghost">Gérer les cartes</Link>
        <Link href="/admin/collections" className="btn-ghost">Gérer les collections</Link>
        <Link href="/admin/import" className="btn-ghost">Importer en masse</Link>
      </div>
    </div>
  );
}
