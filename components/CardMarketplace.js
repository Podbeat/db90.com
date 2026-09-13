"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag, ShoppingCart, Mail, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import ContactUserModal from "@/components/ContactUserModal";

const CONDITIONS = ["Satisfaisant", "Bon état", "Très bon état", "Neuve"];

export default function CardMarketplace({ cardId }) {
  const { t } = useLanguage();
  const [me, setMe] = useState(null);
  const [loggedIn, setLoggedIn] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [price, setPrice] = useState("");
  const [contactTarget, setContactTarget] = useState(null);

  function load() {
    fetch(`/api/cards/${cardId}/listings`)
      .then((r) => r.json())
      .then((d) => {
        setSellers(d.sellers || []);
        setBuyers(d.buyers || []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    fetch("/api/users/me")
      .then((r) => {
        setLoggedIn(r.ok);
        return r.ok ? r.json() : null;
      })
      .then(setMe)
      .catch(() => setLoggedIn(false));
  }, [cardId]);

  useEffect(() => {
    if (!me) return;
    const mine = [...sellers, ...buyers].find((l) => l.userId === me.id);
    setMyListing(mine || null);
    if (mine?.condition) setCondition(mine.condition);
    if (mine?.price) setPrice(String(mine.price));
  }, [me, sellers, buyers]);

  async function setListing(type) {
    await fetch(`/api/cards/${cardId}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, condition, price }),
    });
    load();
  }

  async function removeListing() {
    await fetch(`/api/cards/${cardId}/listings`, { method: "DELETE" });
    setMyListing(null);
    load();
  }

  if (loggedIn === null) return null;

  return (
    <div className="filter-panel" style={{ marginTop: "1.5rem" }}>
      <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Tag size={15} /> {t.marketplaceTitle}
      </div>

      {loggedIn === false ? (
        <Link href="/compte/connexion" className="btn-ghost" style={{ fontSize: "0.78rem" }}>{t.loginToTrade}</Link>
      ) : (
        <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
            <button
              className={myListing?.type === "seller" ? "btn-primary" : "btn-ghost"}
              style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              onClick={() => setListing("seller")}
            >
              <Tag size={13} /> {t.iAmSelling}
            </button>
            <button
              className={myListing?.type === "buyer" ? "btn-primary" : "btn-ghost"}
              style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              onClick={() => setListing("buyer")}
            >
              <ShoppingCart size={13} /> {t.iAmBuying}
            </button>
            {myListing && (
              <button className="btn-icon" onClick={removeListing} title={t.removeListing}><X size={13} /></button>
            )}
          </div>
          {myListing?.type === "seller" && (
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <div className="field" style={{ margin: 0, minWidth: 160 }}>
                <span className="field-label">{t.conditionLabel}</span>
                <select value={condition} onChange={(e) => { setCondition(e.target.value); }} onBlur={() => setListing("seller")}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0, minWidth: 120 }}>
                <span className="field-label">{t.priceLabel}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => setListing("seller")}
                  placeholder="€"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t.sellersTitle} ({sellers.length})</div>
          {sellers.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.noSellers}</div>
          ) : (
            sellers.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                <img src={s.user.avatar || avatarPlaceholder(s.user.username)} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                <Link href={`/u/${s.user.username}`} style={{ fontSize: "0.8rem", flex: 1 }}>{s.user.username}</Link>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.condition}</span>
                {s.price != null && <span style={{ fontSize: "0.8rem", color: "var(--gold)", fontWeight: 600 }}>{s.price} €</span>}
                {me && me.id !== s.userId && (
                  <button className="btn-icon" onClick={() => setContactTarget(s.user)} title={t.contactSeller}>
                    <Mail size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>{t.buyersTitle} ({buyers.length})</div>
          {buyers.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.noBuyers}</div>
          ) : (
            buyers.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                <img src={b.user.avatar || avatarPlaceholder(b.user.username)} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                <Link href={`/u/${b.user.username}`} style={{ fontSize: "0.8rem" }}>{b.user.username}</Link>
              </div>
            ))
          )}
        </div>
      </div>

      {contactTarget && (
        <ContactUserModal
          title={t.contactSellerTitle(contactTarget.username)}
          endpoint={`/api/cards/${cardId}/contact-seller`}
          extraBody={{ sellerUserId: contactTarget.id }}
          onClose={() => setContactTarget(null)}
        />
      )}
    </div>
  );
}
