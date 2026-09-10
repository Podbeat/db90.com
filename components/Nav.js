"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import { LANGUAGES } from "@/lib/translations";

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [pulsing, setPulsing] = useState(null);

  function selectLang(code) {
    setLang(code);
    setPulsing(code);
    setTimeout(() => setPulsing(null), 550);
  }

  return (
    <div className="top-bar">
      <div className="container top-bar-inner">
        <Link href="/">
          <img src="/logo.png" alt="DB Non-Off 90's" className="logo-img" />
          <div className="brand-sub">{t.brandSub}</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
          <div className="nav-links">
            <Link href="/" className={`nav-btn ${isActive("/") ? "active" : ""}`}>{t.navCatalogue}</Link>
            <Link href="/collections" className={`nav-btn ${isActive("/collections") ? "active" : ""}`}>{t.navCollections}</Link>
            <Link href="/informations" className={`nav-btn ${isActive("/informations") ? "active" : ""}`}>{t.navInfo}</Link>
            <Link href="/admin" className={`nav-btn ${isActive("/admin") ? "active" : ""}`}>{t.navAdmin}</Link>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            aria-label="Changer de thème"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="lang-switch">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`lang-flag ${lang === l.code ? "active" : ""} ${pulsing === l.code ? "pulsing" : ""}`}
                onClick={() => selectLang(l.code)}
                title={l.label}
                aria-label={l.label}
                style={{ backgroundImage: `url("${l.flagSvg}")` }}
              >
                <span className="aura" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
