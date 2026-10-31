"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { formatDate } from "@/lib/localize";
import { withMyLiveCount } from "@/lib/registryRank";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";

// Nombre de lignes du classement affichées avant « Voir les N collectionneurs ».
const TOP = 10;

function RaceRow({ entry, total, isMe, t }) {
  const pct = total ? Math.min(100, Math.round((entry.owned / total) * 100)) : null;
  return (
    <li className={`registry-race-row${isMe ? " me" : ""}`}>
      <span className="registry-rank">{entry.rank}</span>
      <span className="registry-race-main">
        {isMe ? (
          <span className="registry-name">{t.registryYou}</span>
        ) : (
          <Link href={`/u/${entry.user.username}`} className="registry-name">{entry.user.username}</Link>
        )}
        {pct !== null && (
          <span className="registry-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      <span className="registry-count">{total ? `${entry.owned}/${total}` : entry.owned}</span>
    </li>
  );
}

// Registre d'une collection : palmarès (collection complète, dans l'ordre d'arrivée), course
// vers le total pour les autres, et le badge à gagner. Le membre connecté y figure avec son
// nombre de cartes à jour, même si la réponse publique date d'une minute.
export default function RegistreClient({ id }) {
  const { t, lang } = useLanguage();
  const { me } = useCurrentUser();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [myOwned, setMyOwned] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/${id}/registry`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("notfound"));
  }, [id]);

  // Références possédées par le membre connecté dans cette collection (une variante d'un
  // numéro déjà possédé ne compte pas en plus).
  useEffect(() => {
    if (!me) return;
    fetch("/api/users/me/cards")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setMyOwned(new Set(d.owned.filter((c) => c.collectionId === id).map((c) => c.numero)).size);
      })
      .catch(() => {});
  }, [me, id]);

  const registry = useMemo(() => {
    if (!data) return null;
    if (me && myOwned !== null) return withMyLiveCount(data, data.collection.total, me.username, myOwned).registry;
    return data;
  }, [data, me, myOwned]);

  if (status === "loading") return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  if (status === "notfound" || !registry) return <div className="container page"><div className="empty-state">{t.notFound}</div></div>;

  const { collection } = data;
  const total = collection.total;
  const isMe = (e) => Boolean(e.isMe || (me && e.user.username === me.username));
  const myRow = registry.ranking.find(isMe);
  const visible = showAll ? registry.ranking : registry.ranking.slice(0, TOP);
  const myRowHidden = Boolean(myRow) && !visible.includes(myRow);

  return (
    <div className="container page registry-page">
      <Link href={`/collections/${collection.id}`} className="registry-back">← {collection.nom}</Link>
      <h1 className="display-font registry-title">{t.registryTitle(collection.nom)}</h1>
      <p className="registry-summary">{t.registrySummary(registry.collectors, registry.completedCount)}</p>

      {registry.collectors === 0 && (
        <div className="empty-state" style={{ marginTop: "1rem" }}>{t.registryEmpty}</div>
      )}

      {registry.completed.length > 0 && (
        <section className="registry-palmares" aria-label={t.registryPalmaresTitle}>
          <div className="registry-palmares-title">
            <Trophy size={16} aria-hidden="true" /> {t.registryPalmaresTitle}
          </div>
          <ol className="registry-palmares-list">
            {registry.completed.map((e) => (
              <li key={e.user.username}>
                <img src={e.user.avatar || avatarPlaceholder(e.user.username)} alt="" className="registry-avatar" />
                {isMe(e) ? (
                  <span className="registry-name">{t.registryYou}</span>
                ) : (
                  <Link href={`/u/${e.user.username}`} className="registry-name">{e.user.username}</Link>
                )}
                <span className="registry-date">{t.registryCompletedOn(formatDate(e.completedAt, lang))}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {registry.ranking.length > 0 && (
        <section className="registry-race" aria-label={total ? t.registryRaceTitle(total) : t.registryRankingTitle}>
          <div className="registry-race-title">{total ? t.registryRaceTitle(total) : t.registryRankingTitle}</div>
          <ol className="registry-race-list">
            {visible.map((e) => (
              <RaceRow key={e.user.username} entry={e} total={total} isMe={isMe(e)} t={t} />
            ))}
            {myRowHidden && (
              <>
                <li className="registry-gap" aria-hidden="true">…</li>
                <RaceRow entry={myRow} total={total} isMe t={t} />
              </>
            )}
          </ol>
          {!showAll && registry.ranking.length > TOP && (
            <button type="button" className="registry-see-all" onClick={() => setShowAll(true)}>
              {t.registrySeeAll(registry.collectors)}
            </button>
          )}
        </section>
      )}

      {total > 0 && (
        <section className="registry-badge" aria-label={t.registryBadgeTitle(collection.nom)}>
          <span className="registry-badge-visual">
            {collection.previewImage ? (
              <Image src={collection.previewImage} alt="" width={56} height={56} sizes={CARD_GRID_SIZES} className="registry-badge-img" />
            ) : (
              <span className="registry-badge-img placeholder" />
            )}
            <span className="registry-badge-check" aria-hidden="true">
              <Check size={13} strokeWidth={3} />
            </span>
          </span>
          <span className="registry-badge-text">
            <span className="registry-badge-name">{t.registryBadgeTitle(collection.nom)}</span>
            <span className="registry-badge-desc">{t.registryBadgeText(total, data.completionPoints)}</span>
          </span>
        </section>
      )}

      <p className="registry-note">{t.registryNote}</p>
    </div>
  );
}
