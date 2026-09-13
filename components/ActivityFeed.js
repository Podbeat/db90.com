"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

function eventLine(e, t) {
  const cardName = e.card?.personnagePrincipal?.name || "";
  if (e.type === "scan_approved") return t.activityScanApproved(e.user.username, cardName);
  if (e.type === "collection_completed") return t.activityCollectionCompleted(e.user.username, e.collection?.nom || "");
  if (e.type === "card_for_sale") return t.activityCardForSale(e.user.username, cardName);
  return "";
}

function eventHref(e) {
  if (e.card) return `/cartes/${e.card.id}`;
  if (e.collection) return `/collections/${e.collection.id}`;
  return "#";
}

export default function ActivityFeed() {
  const { t } = useLanguage();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <div className="filter-panel" style={{ marginBottom: "1.5rem" }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.7rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Activity size={15} /> {t.activityTitle}
      </div>
      {events.map((e) => (
        <Link
          key={e.id}
          href={eventHref(e)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--line)", fontSize: "0.78rem" }}
        >
          <img src={e.user.avatar || avatarPlaceholder(e.user.username)} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <span>{eventLine(e, t)}</span>
        </Link>
      ))}
    </div>
  );
}
