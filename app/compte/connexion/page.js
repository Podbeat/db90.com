"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Connexion impossible.");
        return;
      }
      router.push("/compte");
      router.refresh();
    } catch (e) {
      setError("Erreur réseau, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 380 }}>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>{t.loginTitle}</h1>
      <form onSubmit={handleSubmit} className="form-panel">
        <div className="field">
          <span className="field-label">{t.loginIdentifierLabel}</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
        <div className="field">
          <span className="field-label">{t.passwordLabel}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="toast error">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "…" : t.loginCta}
        </button>
        <div style={{ fontSize: "0.8rem", marginTop: "0.9rem", textAlign: "center" }}>
          {t.noAccountYet} <Link href="/compte/inscription" style={{ color: "var(--accent)" }}>{t.signupCta}</Link>
        </div>
      </form>
    </div>
  );
}
