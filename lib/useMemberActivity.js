"use client";

import { useSyncExternalStore } from "react";

// Cloche et messages de l'en-tête partagent un seul appel : /api/users/me/notifications
// renvoie aussi le nombre de messages non lus. Chaque appel compte dans le quota de
// fonctions Vercel, d'où ces règles :
// - un rafraîchissement toutes les 5 minutes, et aucun tant que l'onglet est caché ;
// - au retour sur l'onglet, mise à jour immédiate si la dernière date de plus d'une minute ;
// - un seul appel en cours à la fois, quel que soit le nombre de composants abonnés.
const REFRESH_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 1000;

const EMPTY = { notifications: [], unreadCount: 0, unreadMessages: 0 };
let state = EMPTY;
let lastFetch = 0;
let lastMarkedRead = 0;
let inFlight = null;
let timer = null;
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function fetchNow() {
  if (inFlight) return inFlight;
  const startedAt = Date.now();
  lastFetch = startedAt;
  inFlight = fetch("/api/users/me/notifications", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d) return;
      setState({
        notifications: d.notifications || [],
        // Réponse partie avant l'ouverture du panneau : son compteur est déjà périmé.
        unreadCount: startedAt < lastMarkedRead ? 0 : d.unreadCount || 0,
        unreadMessages: d.unreadMessages || 0,
      });
    })
    .catch(() => {})
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function refreshIfStale() {
  if (Date.now() - lastFetch > STALE_MS) fetchNow();
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hidden) fetchNow();
  }, REFRESH_MS);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function handleVisibility() {
  if (document.hidden) {
    stopTimer();
  } else {
    refreshIfStale();
    startTimer();
  }
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", handleVisibility);
    if (!document.hidden) {
      refreshIfStale();
      startTimer();
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTimer();
    }
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

export function useMemberActivity() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Ouverture du panneau de notifications : badge remis à zéro tout de suite, puis
// enregistrement côté serveur, puis liste rafraîchie si elle date de plus d'une minute.
export async function markNotificationsRead() {
  if (state.unreadCount > 0) {
    lastMarkedRead = Date.now();
    setState({ unreadCount: 0 });
    try {
      await fetch("/api/users/me/notifications", { method: "POST" });
    } catch (e) {
      // Sans conséquence : le prochain rafraîchissement remettra le bon nombre.
    }
  }
  refreshIfStale();
}

// À appeler quand une page vient de changer un compteur (conversation non lue ouverte).
export function refreshMemberActivity() {
  return fetchNow();
}
