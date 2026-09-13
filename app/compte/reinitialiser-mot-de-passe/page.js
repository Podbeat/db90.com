"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

function ResetPasswordForm() {
  const { t } = useLanguage();
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
      const res = await fetch("/api/users/reset-password", {
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
      setTimeout(() => router.push("/compte/connexion"), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container page" style={{ maxWidth: 380 }}>
        <div className="toast error">{t.resetLinkInvalid}</div>
        <Link href="/compte/mot-de-passe-oublie" style={{ color: "var(--accent)" }}>{t.forgotPasswordCta}</Link>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 380 }}>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>{t.resetPasswordTitle}</h1>
      <div className="form-panel">
        {done ? (
          <div className="toast success">{t.resetPasswordDone}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <span className="field-label">{t.newPasswordLabel}</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            </div>
            <div className="field">
              <span className="field-label">{t.confirmPasswordLabel}</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
            </div>
            {error && <div className="toast error">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "…" : t.resetPasswordCta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
