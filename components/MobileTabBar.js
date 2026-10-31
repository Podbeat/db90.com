"use client";

import Link from "next/link";
import { LayoutGrid, Layers, Tag, Trophy, User } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Barre d'onglets fixée en bas de l'écran, visible uniquement sur mobile (voir globals.css) :
// les cinq rubriques principales restent à portée de pouce, quelle que soit la page.
export default function MobileTabBar({ pathname }) {
  const { t } = useLanguage();
  const path = pathname || "";

  const tabs = [
    { href: "/", label: t.navCatalogue, Icon: LayoutGrid, active: path === "/" || path.startsWith("/cartes") },
    { href: "/collections", label: t.navCollections, Icon: Layers, active: path.startsWith("/collections") },
    { href: "/marche", label: t.marketTitle, Icon: Tag, active: path.startsWith("/marche") },
    { href: "/classement", label: t.leaderboardTitle, Icon: Trophy, active: path.startsWith("/classement") },
    { href: "/compte", label: t.tabAccount, Icon: User, active: path.startsWith("/compte") },
  ];

  return (
    <nav className="mobile-tabbar" aria-label={t.mainNavigation}>
      {tabs.map(({ href, label, Icon, active }) => (
        <Link key={href} href={href} className={`mobile-tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
