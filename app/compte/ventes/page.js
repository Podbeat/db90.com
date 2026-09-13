"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function MySalesPage() {
  const { t } = useLanguage();
  const [selling, setSelling] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/users/me/listings")
      .then((r) => (r.ok ? r.json() : { selling: [] }))
      .then((d) => setSelling(d.selling || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRemove(cardId) {
    await fetch(`/api/cards/${cardId}/listings`, { method: "DELETE" });
    load();
  }

  return (
    <div className="filter-panel">
      <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.6rem" }}>{t.navMySales}</div>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : selling.length === 0 ? (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.noSalesListed}</div>
      ) : (
        selling.map((l) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}>
            <img
              src={l.card.image || ""}
              alt={l.card.personnagePrincipal?.name || ""}
              style={{ width: 40, height: 56, objectFit: "cover", background: "var(--surface-raised)", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.85rem" }}>{l.card.personnagePrincipal?.name || t.noCharacterAssigned}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {l.card.collection?.nom} — n°{l.card.numero} · {l.condition}
              </div>
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--gold)", fontWeight: 600 }}>
              {l.price != null ? `${l.price} €` : t.priceNotSet}
            </span>
            <Link href={`/cartes/${l.card.id}`} className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
              {"→"}
            </Link>
            <button className="btn-icon" onClick={() => handleRemove(l.card.id)} title={t.removeListing}>
              <X size={13} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
