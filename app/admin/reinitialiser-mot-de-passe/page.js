"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AdminResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/admin/login"), 2000);
    } catch (e) {
      setError("Erreur réseau, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container page" style={{ maxWidth: 380 }}>
        <div className="toast error">Ce lien de réinitialisation n'est pas valide.</div>
        <Link href="/admin/mot-de-passe-oublie" style={{ color: "var(--accent)" }}>Refaire une demande</Link>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 380 }}>
      <h1 className="display-font" style={{ fontSize: "1.1rem", marginBottom: "1.25rem" }}>Nouveau mot de passe administrateur</h1>
      <div className="form-panel">
        {done ? (
          <div className="toast success">Mot de passe modifié. Redirection vers la connexion…</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 0 }}>12 caractères minimum.</p>
            <div className="field">
              <span className="field-label">Nouveau mot de passe</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={12} required autoComplete="new-password" />
            </div>
            <div className="field">
              <span className="field-label">Confirmer le mot de passe</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} required autoComplete="new-password" />
            </div>
            {error && (
              <div className="toast error">
                {error}{" "}
                <Link href="/admin/mot-de-passe-oublie" style={{ color: "inherit", textDecoration: "underline" }}>Nouvelle demande</Link>
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "…" : "Enregistrer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AdminResetPasswordForm />
    </Suspense>
  );
}
