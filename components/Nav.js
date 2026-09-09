"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="top-bar">
      <div className="container top-bar-inner">
        <Link href="/">
          <div className="display-font brand-title">Archives Carddass</div>
          <div className="brand-sub">Base de référence des collections de cartes Dragon Ball</div>
        </Link>
        <div className="nav-links">
          <Link href="/" className={`nav-btn ${isActive("/") ? "active" : ""}`}>Catalogue</Link>
          <Link href="/collections" className={`nav-btn ${isActive("/collections") ? "active" : ""}`}>Collections</Link>
          <Link href="/admin" className={`nav-btn ${isActive("/admin") ? "active" : ""}`}>Administration</Link>
        </div>
      </div>
    </div>
  );
}
