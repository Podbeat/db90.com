"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/users/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 380 }}>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>{t.forgotPasswordTitle}</h1>
      <div className="form-panel">
        {sent ? (
          <div className="toast success">{t.forgotPasswordSent}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 0 }}>{t.forgotPasswordIntro}</p>
            <div className="field">
              <span className="field-label">{t.emailLabel}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "…" : t.forgotPasswordCta}
            </button>
          </form>
        )}
        <div style={{ fontSize: "0.8rem", marginTop: "0.9rem", textAlign: "center" }}>
          <Link href="/compte/connexion" style={{ color: "var(--accent)" }}>{t.backToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
