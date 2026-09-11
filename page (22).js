"use client";

import { useLanguage } from "@/components/LanguageProvider";
import ContactForm from "@/components/ContactForm";
import { Coffee } from "lucide-react";

// À remplacer par votre vraie page une fois créée : ko-fi.com/votre-nom
const KOFI_URL = "https://ko-fi.com/dbnonoff90s";

export default function InformationsPage() {
  const { t } = useLanguage();

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <h1 className="display-font" style={{ fontSize: "1.25rem", marginBottom: "1.25rem", lineHeight: 1.4 }}>
        {t.infoTitle}
      </h1>

      <p className="info-text">{t.infoIntro}</p>

      <h2 className="info-subtitle">{t.infoGoalsTitle}</h2>
      <ul className="info-list">
        {t.infoGoals.map((g, i) => <li key={i}>{g}</li>)}
      </ul>

      <p className="info-text">{t.infoShare}</p>
      <p className="info-text">{t.infoScope}</p>

      <h2 className="info-subtitle">{t.infoPhotoTitle}</h2>
      <ul className="info-list">
        {t.infoPhotoList.map((g, i) => <li key={i}>{g}</li>)}
      </ul>

      <p className="info-text">{t.infoClosing}</p>
      <p className="info-welcome">{t.infoWelcome}</p>

      <div className="donate-box">
        <div className="info-subtitle" style={{ marginTop: 0 }}>{t.donateTitle}</div>
        <p className="info-text">{t.donateText}</p>
        <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <Coffee size={15} /> {t.donateButton}
        </a>
      </div>

      <h2 className="info-subtitle">{t.contactTitle}</h2>
      <p className="info-text">{t.contactIntro}</p>
      <ContactForm />
    </div>
  );
}
