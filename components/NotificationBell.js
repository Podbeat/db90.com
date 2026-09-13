"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Cloche de notifications dans l'en-tête : pour l'instant, un seul type de notification
// existe (une carte recherchée vient d'être mise en vente), mais la structure accueille
// d'autres types plus tard sans changement d'interface.
export default function NotificationBell() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  function load() {
    fetch("/api/users/me/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setNotifications(d.notifications);
        setUnreadCount(d.unreadCount);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 120000); // rafraîchi toutes les 2 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      setUnreadCount(0);
      await fetch("/api/users/me/notifications", { method: "POST" });
    }
  }

  function notificationText(n) {
    if (n.type === "card_for_sale" && n.card) {
      return t.notifCardForSale(n.card.personnagePrincipal?.name || n.card.numero);
    }
    if (n.type === "trade_match") return t.notifTradeMatch;
    if (n.type === "rating_received") return t.notifRatingReceived;
    if (n.type === "badge_earned") return t.notifBadgeEarned;
    return "";
  }

  function notificationHref(n) {
    if (n.card) return `/cartes/${n.card.id}`;
    if (n.type === "trade_match") return "/compte/echanges";
    if (n.type === "rating_received" || n.type === "badge_earned") return "/compte";
    return "#";
  }

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        className="btn-icon"
        onClick={handleOpen}
        title={t.notificationsTitle}
        aria-label={t.notificationsTitle}
        style={{ position: "relative" }}
      >
        <Bell size={14} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-title">{t.notificationsTitle}</div>
          {notifications.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.6rem" }}>{t.noNotifications}</div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={notificationHref(n)}
                className="notif-item"
                onClick={() => setOpen(false)}
              >
                {n.card?.image && <img src={n.card.image} alt="" style={{ width: 28, height: 39, objectFit: "cover", flexShrink: 0 }} />}
                <span>{notificationText(n)}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
