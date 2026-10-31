"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        const data = await res.json();
        setError(data.error || "Trop de tentatives.");
        return;
      }
      setSent(true);
    } catch (e) {
      setError("Erreur réseau, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 380 }}>
      <h1 className="display-font" style={{ fontSize: "1.1rem", marginBottom: "1.25rem" }}>Mot de passe administrateur oublié</h1>
      <div className="form-panel">
        {sent ? (
          <div className="toast success">
            Si cette adresse correspond au compte administrateur, un lien de réinitialisation vient d'y être envoyé. Il est valable 15 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 0 }}>
              Saisissez l'adresse e-mail du compte administrateur pour recevoir un lien de réinitialisation.
            </p>
            <div className="field">
              <span className="field-label">Adresse e-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            {error && <div className="toast error">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "…" : "Recevoir le lien"}
            </button>
          </form>
        )}
        <div style={{ fontSize: "0.8rem", marginTop: "0.9rem", textAlign: "center" }}>
          <Link href="/admin/login" style={{ color: "var(--accent)" }}>Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
