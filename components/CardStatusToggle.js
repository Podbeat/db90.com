"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Boutons « Je l'ai » / « À l'échange » / « Je la recherche » sur la fiche carte, pour les
// visiteurs connectés (voir lib/cardStatus.js). « À l'échange » veut dire : je l'ai et je
// peux l'échanger ; seules ces cartes servent aux échanges possibles. Un clic sur le statut
// déjà actif le retire (bascule). Invite à se connecter si personne n'est identifié — ne
// fait aucune supposition tant que la vérification initiale n'est pas terminée.
export default function CardStatusToggle({ cardId, onChange }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    fetch(`/api/users/me/cards?cardId=${cardId}`)
      .then((r) => {
        if (r.status === 401) { setLoggedIn(false); return null; }
        setLoggedIn(true);
        return r.json();
      })
      .then((d) => { if (d) setStatus(d.status); })
      .catch(() => setLoggedIn(false));
  }, [cardId]);

  async function setCardStatus(next) {
    const newStatus = status === next ? null : next;
    setStatus(newStatus); // mise à jour immédiate : le bouton change de couleur sans attendre le serveur
    onChange?.(status, newStatus);
    await fetch("/api/users/me/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, status: newStatus }),
    });
  }

  if (loggedIn === null) return null;

  if (loggedIn === false) {
    return (
      <Link href="/compte/connexion" className="btn-ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>
        {t.loginRequiredForCards}
      </Link>
    );
  }

  const options = [
    { key: "owned", Icon: Check, label: t.iOwnCard },
    { key: "trade", Icon: ArrowLeftRight, label: t.iTradeCard },
    { key: "wanted", Icon: Search, label: t.iWantCard },
  ];
  const hint = { owned: t.statusHintOwned, trade: t.statusHintTrade, wanted: t.statusHintWanted }[status];

  return (
    <div className="status-toggle-wrap">
      <div className="status-toggle">
        {options.map(({ key, Icon, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={status === key}
            onClick={() => setCardStatus(key)}
            className={`status-toggle-btn ${key}${status === key ? " active" : ""}`}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      {hint && <p className="status-toggle-hint">{hint}</p>}
    </div>
  );
}
