"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { T, DEFAULT_LANG } from "@/lib/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("dbnonoff90s-lang");
      if (saved && T[saved]) setLangState(saved);
    } catch (e) {}
  }, []);

  function setLang(code) {
    setLangState(code);
    try {
      window.localStorage.setItem("dbnonoff90s-lang", code);
    } catch (e) {}
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
