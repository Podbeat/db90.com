"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";

function VerifyEmailContent() {
  const { t } = useLanguage();
  const { refetch } = useCurrentUser();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("checking"); // checking | ok | error

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch("/api/users/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok }) => {
        setStatus(ok ? "ok" : "error");
        if (ok) refetch();
      })
      .catch(() => setStatus("error"));
  }, [token, refetch]);

  return (
    <div className="container page" style={{ maxWidth: 380 }}>
      <div className="form-panel">
        {status === "checking" && <div className="empty-state">{t.loading}</div>}
        {status === "ok" && <div className="toast success">{t.emailVerifiedSuccess}</div>}
        {status === "error" && <div className="toast error">{t.emailVerifiedError}</div>}
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link href="/compte" style={{ color: "var(--accent)", fontSize: "0.85rem" }}>{t.navMyProfile}</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
