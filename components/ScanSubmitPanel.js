"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, ScanLine, Crop, Sparkles, CircleCheck, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { uploadOriginal } from "@/lib/clientUpload";

// Envoi guidé d'un scan par un membre, commun à tous les cas (carte sans visuel, nouvel
// effet, carte non répertoriée, proposition de collection) : consignes, dépôt du fichier,
// aperçu avec contrôle de la définition, envoi de l'original HD avec progression, puis
// confirmation et suivi. « submit(file, { originalUrl }) » envoie la proposition elle-même.
const GOOD_SIDE = 1200;

export function ScanSteps({ step }) {
  const { t } = useLanguage();
  const labels = [t.scanStepSent, t.scanStepValidated, t.scanStepOnline];
  return (
    <ol className="scan-steps">
      {labels.map((label, i) => (
        <li key={label} className={i < step ? "done" : i === step ? "current" : ""}>
          <span className="scan-step-dot">{i < step ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export default function ScanSubmitPanel({ title, submit, validate, children, onSent }) {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function choose(f) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setError(t.scanFormats);
    setError("");
    setDims(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  async function send() {
    const problem = validate?.();
    if (problem) return setError(problem);
    setError("");
    setProgress(0);
    try {
      const originalUrl = await uploadOriginal(file, (p) => setProgress(Math.round(p * 100)));
      setProgress(100);
      const data = await submit(file, { originalUrl });
      setSent({ noOriginal: !originalUrl });
      onSent?.(data);
    } catch (e) {
      setError(e.message || "Échec de l'envoi.");
    } finally {
      setProgress(null);
    }
  }

  if (sent) {
    return (
      <section className="scan-panel done" aria-live="polite">
        <div className="scan-thanks">
          <CircleCheck size={26} aria-hidden="true" />
          <div>
            <strong>{t.scanThanksTitle}</strong>
            <p>{t.scanThanksText}</p>
          </div>
        </div>
        {sent.noOriginal && <p className="scan-note">{t.scanNoOriginal}</p>}
        <ScanSteps step={1} />
        <Link href="/compte/envois" className="scan-link">{t.myUploadsLink}</Link>
      </section>
    );
  }

  const good = dims && Math.max(dims.w, dims.h) >= GOOD_SIDE;
  const sending = progress !== null;
  return (
    <section className="scan-panel">
      <h3 className="scan-panel-title display-font">{title || t.scanGuideTitle}</h3>
      <ul className="scan-tips">
        <li><ScanLine size={16} aria-hidden="true" /> {t.scanTipFlat}</li>
        <li><Crop size={16} aria-hidden="true" /> {t.scanTipNoCrop}</li>
        <li><Sparkles size={16} aria-hidden="true" /> {t.scanTipClean}</li>
      </ul>
      {children}
      {!file ? (
        <label className={`scan-drop${over ? " over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]); }}>
          <Upload size={24} aria-hidden="true" />
          <strong>{t.scanDropLabel}</strong>
          <span>{t.scanFormats}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      ) : (
        <div className="scan-preview">
          <img src={preview} alt="" className="scan-preview-img" />
          <div className="scan-preview-body">
            {dims && <div className={`scan-quality ${good ? "good" : "low"}`}>{good ? t.scanQualityGood(dims.w, dims.h) : t.scanQualityLow(dims.w, dims.h)}</div>}
            <div className="scan-file">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo</div>
            {sending ? (
              <div className="scan-progress" role="status">
                <span className="scan-progress-bar"><span style={{ width: `${progress}%` }} /></span>
                <span>{progress < 100 ? t.scanSendingOriginal(progress) : t.scanSendingCopy}</span>
              </div>
            ) : (
              <div className="scan-actions">
                <button type="button" className="btn-primary scan-btn" onClick={send}><Upload size={16} aria-hidden="true" /> {t.scanSend}</button>
                <button type="button" className="btn-ghost scan-btn" onClick={() => { setFile(null); setPreview(null); }}>{t.scanChangeFile}</button>
              </div>
            )}
          </div>
        </div>
      )}
      {error && <div className="toast error">{error}</div>}
    </section>
  );
}
