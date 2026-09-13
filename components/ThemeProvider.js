"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("dbnonoff90s-theme");
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
        document.documentElement.classList.toggle("light", saved === "light");
      }
    } catch (e) {}
  }, []);

  function setTheme(next) {
    setThemeState(next);
    document.documentElement.classList.toggle("light", next === "light");
    try {
      window.localStorage.setItem("dbnonoff90s-theme", next);
    } catch (e) {}
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
