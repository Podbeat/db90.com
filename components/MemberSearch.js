"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

// Petite zone de recherche de membres dans l'en-tête : tape un pseudo, choisis dans la
// liste, direction son profil public. Recherche à la volée avec un léger anti-rebond.
export default function MemberSearch() {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          setResults(d);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
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

  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search size={13} style={{ position: "absolute", left: "0.5rem", color: "var(--header-muted)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t.searchMemberPlaceholder}
          className="member-search-input"
        />
      </div>
      {open && results.length > 0 && (
        <div className="notif-panel" style={{ width: 220 }}>
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
