"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { LANGUAGES } from "@/lib/translations";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import NotificationBell from "@/components/NotificationBell";
import MessagesLink from "@/components/MessagesLink";

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [pulsing, setPulsing] = useState(null);
  const { me, loading, refetch } = useCurrentUser();
  const meLoaded = !loading;

  async function handleLogout() {
    await fetch("/api/users/logout", { method: "POST" });
    await refetch();
    window.location.href = "/";
  }

  function selectLang(code) {
    setLang(code);
    setPulsing(code);
    setTimeout(() => setPulsing(null), 550);
  }

  return (
    <div className="top-bar">
      <div className="container">
        <div className="top-bar-flex">
          <Link href="/">
            <img src="/logo.png" alt="DB Non-Off 90's" className="logo-img" />
            <div className="brand-sub">{t.brandSub}</div>
          </Link>
          <div className="top-bar-right">
            <div className="top-bar-inner">
              <div className="nav-links">
                <Link href="/" className={`nav-btn ${isActive("/") ? "active" : ""}`}>{t.navCatalogue}</Link>
                <Link href="/collections" className={`nav-btn ${isActive("/collections") ? "active" : ""}`}>{t.navCollections}</Link>
                <Link href="/classement" className={`nav-btn ${isActive("/classement") ? "active" : ""}`}>{t.leaderboardTitle}</Link>
                <Link href="/marche" className={`nav-btn ${isActive("/marche") ? "active" : ""}`}>{t.marketTitle}</Link>
                <Link href="/informations" className={`nav-btn ${isActive("/informations") ? "active" : ""}`}>{t.navInfo}</Link>
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
            {meLoaded && (
              <div className="top-bar-account-row">
                {me ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <NotificationBell />
                    <MessagesLink />
                    <Link href="/compte" className="nav-account" title={t.myAccount}>
                      {me.avatar ? (
                        <img src={me.avatar} alt="" className="nav-avatar" />
                      ) : (
                        <img src={avatarPlaceholder(me.username)} alt="" className="nav-avatar" />
                      )}
                      <span>{me.username}</span>
                    </Link>
                    <button className="nav-logout" onClick={handleLogout}>
                      {t.logout}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link href="/compte/connexion" className="nav-btn" style={{ color: "var(--header-muted)" }}>{t.login}</Link>
                    <Link href="/compte/inscription" className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>{t.signup}</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
