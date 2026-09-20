"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import ActivityFeed from "@/components/ActivityFeed";

function RankList({ items }) {
  if (items.length === 0) return null;
  return (
    <div className="filter-panel" style={{ flex: 1, minWidth: 280 }}>
      {items.map((item, i) => (
        <Link
          key={item.user.username}
          href={`/u/${item.user.username}`}
          style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: i < 3 ? "var(--gold)" : "var(--text-muted)", width: 20 }}>{i + 1}</span>
          <img src={item.user.avatar || avatarPlaceholder(item.user.username)} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
          <span style={{ flex: 1, fontSize: "0.85rem" }}>{item.user.username}</span>
          <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>{item.count}</span>
        </Link>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container page">
      <h1 className="display-font" style={{ fontSize: "1.4rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Trophy size={22} style={{ color: "var(--gold)" }} /> {t.leaderboardTitle}
      </h1>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.leaderboardTopCollectors}</div>
              <RankList items={data?.topCollectors || []} />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.leaderboardTopContributors}</div>
              <RankList items={data?.topContributors || []} />
            </div>
          </div>
          <ActivityFeed />
        </>
      )}
    </div>
  );
}
