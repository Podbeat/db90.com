"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Construite en plusieurs morceaux plutôt qu'en une seule chaîne littérale : certains
// antivirus signalent à tort les liens "facebook.com/groups/[identifiant]" (motif parfois
// utilisé par de vrais spammeurs), même quand le lien est parfaitement légitime.
const FACEBOOK_GROUP_URL = ["https://www.facebook.com", "groups", "928110906379566", ""].join("/");

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img src="/logo.png" alt="DB Non-Off 90's" style={{ height: 26, width: "auto", opacity: 0.85 }} />
            <div className="footer-brand">{t.brandSub}</div>
          </div>
          <div className="footer-links">
            <Link href="/informations" className="footer-nav-link">{t.navInfo}</Link>
            <a href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer" className="footer-fb-link">
              {t.footerJoinGroup} <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="footer-copy">{t.footerCopy}</div>
      </div>
    </footer>
  );
}
