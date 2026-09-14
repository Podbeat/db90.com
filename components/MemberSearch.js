"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

// Recherche de membres : cliquer dans le champ affiche d'emblée une liste de membres à
// parcourir (les plus récents), pratique pour quelqu'un qui ne connaît encore aucun pseudo
// précis ; taper filtre cette liste dès la première lettre. Deux présentations : "header"
// (compacte, thème sombre de l'en-tête) et "sidebar" (pleine largeur, thème normal de la
// page, utilisée dans le panneau de filtres du catalogue).
export default function MemberSearch({ variant = "header" }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setResults)
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToProfile(username) {
    setOpen(false);
    setQuery("");
    router.push(`/u/${username}`);
  }

  const isSidebar = variant === "sidebar";

  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      <div className={isSidebar ? "search-wrap" : undefined} style={isSidebar ? undefined : { position: "relative", display: "flex", alignItems: "center" }}>
        <Search
          size={14}
          className={isSidebar ? "search-icon" : undefined}
          style={isSidebar ? undefined : { position: "absolute", left: "0.5rem", color: "var(--header-muted)", pointerEvents: "none" }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t.searchMemberPlaceholder}
          className={isSidebar ? undefined : "member-search-input"}
        />
      </div>
      {open && results.length > 0 && (
        <div className="notif-panel" style={{ width: isSidebar ? "100%" : 220 }}>
          {results.map((u) => (
            <button key={u.username} className="notif-item" style={{ width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left" }} onClick={() => goToProfile(u.username)}>
              <img src={u.avatar || avatarPlaceholder(u.username)} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
              <span>{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
