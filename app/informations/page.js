"use client";

import { useLanguage } from "@/components/LanguageProvider";
import ContactForm from "@/components/ContactForm";

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

      <h2 className="info-subtitle">{t.contactTitle}</h2>
      <p className="info-text">{t.contactIntro}</p>
      <ContactForm />
    </div>
  );
}
