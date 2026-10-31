"use client";

import Link from "next/link";
import { ExternalLink, HeartHandshake, Users } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { FACEBOOK_GROUP_URL, DONATE_URL } from "@/lib/siteLinks";

// Sur ordinateur : logo et slogan à gauche, liens à droite. Sur téléphone (globals.css,
// ≤ 720 px) : tout est centré, les deux boutons côte à côte, et « Informations » rejoint
// la ligne du bas avec l'accès à l'administration.
export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-identity">
            <Link href="/" aria-label="DB Non-Off 90's">
              <img src="/logo.png" alt="DB Non-Off 90's" className="footer-logo" />
            </Link>
            <div className="footer-brand">{t.brandSub}</div>
          </div>
          <div className="footer-links">
            <Link href="/informations" className="footer-nav-link footer-info-desktop">{t.navInfo}</Link>
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="footer-kofi-link">
              <HeartHandshake size={14} aria-hidden="true" /> {t.supportUs}
            </a>
            <a href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer" className="footer-fb-link">
              <Users size={16} aria-hidden="true" className="footer-fb-icon" />
              <span className="footer-label-long">{t.footerJoinGroup}</span>
              <span className="footer-label-short">{t.footerFacebookShort}</span>
              <ExternalLink size={14} aria-hidden="true" className="footer-fb-external" />
            </a>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="footer-copy">
          <nav className="footer-mobile-links" aria-label={t.navInfo}>
            <Link href="/informations" className="footer-mobile-link">{t.footerInfoContact}</Link>
            <span aria-hidden="true" className="footer-dot">·</span>
            <Link href="/admin" className="footer-mobile-link">{t.navAdmin}</Link>
          </nav>
          <span className="footer-copy-text">{t.footerCopy}</span>
          <span className="footer-copy-admin">
            {" · "}
            <Link href="/admin" className="footer-admin-link">{t.navAdmin}</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
