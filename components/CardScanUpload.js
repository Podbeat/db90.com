"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Clock, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { submitCardScan } from "@/lib/clientUpload";

// Formulaire de proposition de scan pour une carte "recherchée", affiché uniquement quand
// la carte n'a pas encore de visuel. Le fichier est traité comme un import classique côté
// serveur, mais reste en attente de validation admin (voir /admin/scans) avant d'apparaître
// réellement sur la carte.
export default function CardScanUpload({ cardId }) {
  const { t } = useLanguage();
  const fileRef = useRef(null);
  const [loggedIn, setLoggedIn] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/cards/${cardId}/submissions`)
      .then((r) => {
        setLoggedIn(r.status !== 401);
        return r.json();
      })
      .then((d) => setStatus(d.status))
      .catch(() => setLoggedIn(false));
  }, [cardId]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await submitCardScan(cardId, file);
      setStatus(data.status);
    } catch (err) {
      setError(err.message || "Échec de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  if (loggedIn === null) return null;

  if (loggedIn === false) {
    return (
      <div className="filter-panel" style={{ marginTop: "1rem" }}>
        <div style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>{t.proposeScanTitle}</div>
        <Link href="/compte/connexion" className="btn-ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>
          {t.loginToProposeScan}
        </Link>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="filter-panel" style={{ marginTop: "1rem" }}>
        <div style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
          <Clock size={14} /> {t.scanPending}
        </div>
      </div>
    );
  }

  return (
    <div className="filter-panel" style={{ marginTop: "1rem" }}>
      <div style={{ fontSize: "0.8rem", marginBottom: "0.6rem" }}>
        {status === "rejected" ? t.scanRejectedRetry : t.proposeScanTitle}
      </div>
      <div className="upload-zone" onClick={() => !uploading && fileRef.current?.click()}>
        {status === "rejected" ? <RotateCcw size={16} style={{ margin: "0 auto 0.3rem" }} /> : <Upload size={16} style={{ margin: "0 auto 0.3rem" }} />}
        {uploading ? "Envoi en cours…" : t.proposeScanCta}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      </div>
      {error && <div className="toast error" style={{ marginTop: "0.5rem" }}>{error}</div>}
    </div>
  );
}
