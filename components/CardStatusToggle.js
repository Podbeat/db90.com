"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Boutons "Je l'ai" / "Je la recherche" sur la fiche carte, pour les visiteurs connectés à
// leur compte. Un clic sur le statut déjà actif le retire (bascule). Invite à se connecter
// si personne n'est identifié — ne fait aucune supposition sur l'état de connexion tant que
// la vérification initiale n'est pas terminée, pour éviter un flash incorrect.
export default function CardStatusToggle({ cardId }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loggedIn, setLoggedIn] = useState(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    const newStatus = status === next ? null : next;
    try {
      await fetch("/api/users/me/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, status: newStatus }),
      });
      setStatus(newStatus);
    } finally {
      setBusy(false);
    }
  }

  if (loggedIn === null) return null;

  if (loggedIn === false) {
    return (
      <Link href="/compte/connexion" className="btn-ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>
        {t.loginRequiredForCards}
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setCardStatus("owned")}
        className={status === "owned" ? "btn-primary" : "btn-ghost"}
        style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <Check size={13} /> {t.iOwnCard}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setCardStatus("wanted")}
        className={status === "wanted" ? "btn-primary" : "btn-ghost"}
        style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <Search size={13} /> {t.iWantCard}
      </button>
    </div>
  );
}
