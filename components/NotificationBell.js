"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useMemberActivity, markNotificationsRead } from "@/lib/useMemberActivity";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";

// Cloche de notifications dans l'en-tête : pour l'instant, un seul type de notification
// existe (une carte recherchée vient d'être mise en vente), mais la structure accueille
// d'autres types plus tard sans changement d'interface. Les données viennent de l'appel
// partagé avec l'icône des messages (lib/useMemberActivity.js).
// Notifications d'échange suivi : texte selon l'étape, avec le pseudo de l'autre membre.
const TRADE_NOTIFICATION_KEYS = {
  trade_proposed: "notifTradeProposed",
  trade_accepted: "notifTradeAccepted",
  trade_declined: "notifTradeDeclined",
  trade_cancelled: "notifTradeCancelled",
  trade_sent: "notifTradeSent",
  trade_received: "notifTradeReceived",
  trade_completed: "notifTradeCompleted",
};

export default function NotificationBell() {
  const { t } = useLanguage();
  const { notifications, unreadCount } = useMemberActivity();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    const opening = !open;
    setOpen(opening);
    if (opening) markNotificationsRead();
  }

  function notificationText(n) {
    if (n.type === "card_for_sale" && n.card) {
      return t.notifCardForSale(n.card.personnagePrincipal?.name || n.card.numero);
    }
    if (n.type === "trade_match") return t.notifTradeMatch;
    if (n.type === "rating_received") return t.notifRatingReceived;
    if (n.type === "badge_earned") return t.notifBadgeEarned;
    if (n.tradeId && TRADE_NOTIFICATION_KEYS[n.type]) return t[TRADE_NOTIFICATION_KEYS[n.type]](n.actor || "");
    return "";
  }

  function notificationHref(n) {
    if (n.tradeId) return `/compte/echanges/${n.tradeId}`;
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
                {n.card?.image && (
                  <Image src={n.card.image} alt="" width={28} height={39} sizes={CARD_GRID_SIZES} style={{ objectFit: "cover", flexShrink: 0 }} />
                )}
                <span>{notificationText(n)}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
