"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function SignupPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Inscription impossible.");
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
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>{t.signupTitle}</h1>
      <form onSubmit={handleSubmit} className="form-panel">
        <div className="field">
          <span className="field-label">{t.usernameLabel}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            pattern="[a-z0-9_-]{3,20}"
            title="3 à 20 caractères : lettres minuscules, chiffres, - ou _"
            required
          />
        </div>
        <div className="field">
          <span className="field-label">{t.emailLabel}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <span className="field-label">{t.passwordLabel}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </div>
        <div className="field">
          <span className="field-label">{t.confirmPasswordLabel}</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
        </div>
        {error && <div className="toast error">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "…" : t.signupCta}
        </button>
        <div style={{ fontSize: "0.8rem", marginTop: "0.9rem", textAlign: "center" }}>
          {t.alreadyHaveAccount} <Link href="/compte/connexion" style={{ color: "var(--accent)" }}>{t.loginCta}</Link>
        </div>
      </form>
    </div>
  );
}
