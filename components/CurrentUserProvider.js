"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Un seul point de vérité pour "qui est connecté ?", chargé une fois par navigation
// plutôt que redemandé séparément par chaque composant qui en a besoin (Nav, page compte,
// profil public, marketplace...). Avant ce contexte, jusqu'à 3-4 appels identiques à
// /api/users/me pouvaient partir en parallèle pour une seule page — chacun un aller-retour
// réseau supplémentaire, particulièrement coûteux si le serveur et la base de données sont
// géographiquement éloignés.
const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMe(data);
        return data;
      })
      .catch(() => {
        setMe(null);
        return null;
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <CurrentUserContext.Provider value={{ me, loading, loggedIn: !!me, refetch }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
