"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Fenêtre de contact réutilisable : utilisée pour contacter un vendeur depuis une fiche
// carte (avec le contexte de la carte dans le corps de la requête) et pour contacter
// n'importe quel membre depuis son profil public (endpoint générique, sans contexte).
export default function ContactUserModal({ title, endpoint, extraBody, onClose }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ...extraBody }),
      });
      const data = await res.json();
      if (res.ok) setSent(true);
      else setError(data.error || "Échec de l'envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }} onClick={onClose}>
      <div className="form-panel" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
          <div className="display-font" style={{ fontSize: "1rem" }}>{title}</div>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        {sent ? (
          <div className="toast success">{t.messageSent}</div>
        ) : (
          <>
            <div className="field">
              <span className="field-label">{t.messageLabel}</span>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} />
            </div>
            {error && <div className="toast error">{error}</div>}
            <button className="btn-primary" onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? "…" : t.sendMessage}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
