"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function ReportError({ cardId }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, message, contact }),
      });
      if (res.ok) {
        setStatus("sent");
        setMessage("");
        setContact("");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "none", border: "1px solid var(--line)", color: "var(--text-muted)",
          padding: "0.4rem 0.7rem", fontSize: "0.78rem", cursor: "pointer", marginTop: "1rem",
        }}
      >
        <Flag size={13} /> {t.reportButton}
      </button>
    );
  }

  if (status === "sent") {
    return <div style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--gold)" }}>{t.reportSent}</div>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem", border: "1px solid var(--line)", padding: "0.9rem", maxWidth: 420 }}>
      <div style={{ fontSize: "0.8rem", marginBottom: "0.6rem" }}>{t.reportPrompt}</div>
      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t.reportPlaceholder}
        required
        style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "0.5rem 0.6rem", fontSize: "0.85rem", fontFamily: "inherit", marginBottom: "0.6rem" }}
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder={t.reportContact}
        style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)", padding: "0.5rem 0.6rem", fontSize: "0.85rem", fontFamily: "inherit", marginBottom: "0.6rem" }}
      />
      {status === "error" && (
        <div style={{ fontSize: "0.78rem", color: "var(--accent)", marginBottom: "0.5rem" }}>{t.reportError}</div>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid var(--line)", color: "var(--text)", padding: "0.4rem 0.8rem", fontSize: "0.8rem", cursor: "pointer" }}>
          {t.reportCancel}
        </button>
        <button type="submit" disabled={status === "sending"} style={{ background: "var(--gold)", border: "none", color: "#1a1208", padding: "0.4rem 0.8rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
          {status === "sending" ? t.reportSending : t.reportSend}
        </button>
      </div>
    </form>
  );
}
