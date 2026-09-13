"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Icône de raccourci vers la messagerie, avec un badge du nombre de messages non lus —
// même principe visuel que la cloche de notifications, dans le même style compact.
export default function MessagesLink() {
  const { t } = useLanguage();
  const [count, setCount] = useState(0);

  useEffect(() => {
    function load() {
      fetch("/api/users/me/messages/unread-count")
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((d) => setCount(d.count || 0))
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/compte/messages" className="btn-icon" style={{ position: "relative" }} title={t.messagesTitle} aria-label={t.messagesTitle}>
      <Mail size={14} />
      {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
