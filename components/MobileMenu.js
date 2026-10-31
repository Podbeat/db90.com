"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check, Search, Store, Info, HeartHandshake, Users, ChevronRight, LogOut, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import { LANGUAGES } from "@/lib/translations";
import { FACEBOOK_GROUP_URL, DONATE_URL } from "@/lib/siteLinks";

// Menu plein écran du mobile (bouton ☰ de l'en-tête) : raccourcis de l'espace membre, pages
// du site, langue, thème et compte. Les rubriques principales restent dans la barre
// d'onglets du bas, ce menu ne garde que le reste.
export default function MobileMenu({ me, onClose, onLogout }) {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div id="mobile-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-label={t.menuOpen}>
      <div className="mobile-menu-top">
        <Link href="/" aria-label="DB Non-Off 90's" onClick={onClose}>
          <img src="/logo.png" alt="DB Non-Off 90's" className="mobile-logo" />
        </Link>
        <button type="button" className="mobile-menu-btn" aria-label={t.menuClose} onClick={onClose}>
          <X size={24} aria-hidden="true" />
        </button>
      </div>
      <div className="glossy-divider" />

      <nav className="mobile-menu-body" aria-label={t.menuOpen}>
        {me && (
          <>
            <div className="mobile-menu-section">{t.menuMySpace}</div>
            <Link href="/compte/collection" className="mobile-menu-item" onClick={onClose}>
              <Check size={20} aria-hidden="true" /> {t.myCollectionTitle}
              <ChevronRight size={18} className="mobile-menu-chevron" aria-hidden="true" />
            </Link>
            <Link href="/compte/recherchees" className="mobile-menu-item" onClick={onClose}>
              <Search size={20} aria-hidden="true" /> {t.myWantedTitle}
              <ChevronRight size={18} className="mobile-menu-chevron" aria-hidden="true" />
            </Link>
            <Link href="/compte/ventes" className="mobile-menu-item" onClick={onClose}>
              <Store size={20} aria-hidden="true" /> {t.navMySales}
              <ChevronRight size={18} className="mobile-menu-chevron" aria-hidden="true" />
            </Link>
            <div className="mobile-menu-divider" />
          </>
        )}

        <div className="mobile-menu-section">{t.menuSite}</div>
        <Link href="/informations" className="mobile-menu-item" onClick={onClose}>
          <Info size={20} aria-hidden="true" /> {t.navInfo}
        </Link>
        <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="mobile-menu-item">
          <HeartHandshake size={20} aria-hidden="true" /> {t.supportUs}
        </a>
        <a href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer" className="mobile-menu-item">
          <Users size={20} aria-hidden="true" /> {t.footerJoinGroup}
        </a>

        <div className="mobile-menu-divider" />

        <div className="mobile-menu-section">{t.menuLanguage}</div>
        <div className="mobile-menu-langs">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`mobile-menu-lang ${lang === l.code ? "active" : ""}`}
              aria-pressed={lang === l.code}
              onClick={() => setLang(l.code)}
            >
              {l.name || l.label}
            </button>
          ))}
        </div>

        <div className="mobile-menu-theme">
          <span>{t.menuTheme}</span>
          <div className="mobile-menu-segment" role="group" aria-label={t.menuTheme}>
            <button type="button" className={theme === "dark" ? "active" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
              {t.themeDark}
            </button>
            <button type="button" className={theme === "light" ? "active" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
              {t.themeLight}
            </button>
          </div>
        </div>

        <div className="mobile-menu-footer">
          {me ? (
            <button type="button" className="btn-ghost" onClick={onLogout}>
              <LogOut size={16} aria-hidden="true" /> {t.logout}
            </button>
          ) : (
            <div className="mobile-menu-auth">
              <Link href="/compte/connexion" className="btn-ghost" onClick={onClose}>{t.login}</Link>
              <Link href="/compte/inscription" className="btn-primary" onClick={onClose}>{t.signup}</Link>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
