"use client";

import { useLanguage } from "@/components/LanguageProvider";
import ContactForm from "@/components/ContactForm";
import { Archive, ScanLine, MessageCircle, Facebook, Sparkles } from "lucide-react";

// À remplacer par votre vrai lien une fois le compte PayPal du site créé, ex. :
// "https://www.paypal.com/paypalme/votre-nom" ou "https://www.paypal.com/donate/?hosted_button_id=..."
const DONATE_URL = "https://www.paypal.com/paypalme/dbnonoff90s";

// Construite en plusieurs morceaux, comme le lien du groupe Facebook dans le footer.
const FACEBOOK_GROUP_URL = ["https://www.facebook.com", "groups", "928110906379566", ""].join("/");

export default function InformationsPage() {
  const { t } = useLanguage();

  return (
    <div className="container page" style={{ maxWidth: 960 }}>
      <div className="info-grid">
        <div className="info-block">
          <div className="info-block-header">
            <div className="info-block-icon icon-about"><Archive size={16} /></div>
            <div className="info-block-title">{t.infoAboutTitle}</div>
          </div>
          <p className="info-block-text">{t.infoAboutText}</p>
          <ul className="info-list">
            {t.infoAboutList.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
          <a href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer" className="info-fb-link">
            <Facebook size={14} /> {t.footerJoinGroup}
          </a>
        </div>

        <div className="info-block info-block-features">
          <div className="info-block-header">
            <div className="info-block-icon" style={{ background: "rgba(224, 176, 74, 0.12)", color: "var(--gold)" }}><Sparkles size={16} /></div>
            <div className="info-block-title">{t.infoFeaturesTitle}</div>
          </div>
          <div className="feat-grid">
            <div>
              <div className="feat-cat-title">{t.infoFeaturesCatalogueTitle}</div>
              <ul className="feat-list">{t.infoFeaturesCatalogueItems.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
            <div>
              <div className="feat-cat-title">{t.infoFeaturesContribTitle}</div>
              <ul className="feat-list">{t.infoFeaturesContribItems.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
            <div>
              <div className="feat-cat-title">{t.infoFeaturesMarketTitle}</div>
              <ul className="feat-list">{t.infoFeaturesMarketItems.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
            <div>
              <div className="feat-cat-title">{t.infoFeaturesCommunityTitle}</div>
              <ul className="feat-list">{t.infoFeaturesCommunityItems.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
            <div>
              <div className="feat-cat-title">{t.infoFeaturesProgressTitle}</div>
              <ul className="feat-list">{t.infoFeaturesProgressItems.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
            <div>
              <div className="feat-cat-title">{t.infoFeaturesAccountTitle}</div>
              <ul className="feat-list">{t.infoFeaturesAccountItems.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
          </div>
        </div>

        <div className="info-block">
          <div className="info-block-header">
            <div className="info-block-icon icon-contribute"><ScanLine size={16} /></div>
            <div className="info-block-title">{t.infoContributeTitle}</div>
          </div>
          {t.infoContributeText.map((p, i) => <p key={i} className="info-block-text" style={{ marginBottom: "0.9rem" }}>{p}</p>)}
        </div>

        <div className="info-block info-block-donate">
          <div className="info-block-header">
            <div className="info-block-title">{t.donateTitle}</div>
          </div>
          {t.donateText.map((p, i) => <p key={i} className="info-block-text" style={{ marginBottom: "0.9rem" }}>{p}</p>)}
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="paypal-donate-btn">
            {t.donateButton}
          </a>
        </div>

        <div className="info-block info-block-contact">
          <div className="info-block-header">
            <div className="info-block-icon icon-contact"><MessageCircle size={16} /></div>
            <div className="info-block-title">{t.contactTitle}</div>
          </div>
          <p className="info-block-text">{t.contactIntro}</p>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
