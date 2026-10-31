"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useMemberActivity } from "@/lib/useMemberActivity";

// Icône de raccourci vers la messagerie, avec un badge du nombre de messages non lus —
// même principe visuel que la cloche de notifications, dans le même style compact. Le
// compteur vient de l'appel partagé avec la cloche (lib/useMemberActivity.js).
export default function MessagesLink() {
  const { t } = useLanguage();
  const { unreadMessages: count } = useMemberActivity();

  return (
    <Link href="/compte/messages" className="btn-icon" style={{ position: "relative" }} title={t.messagesTitle} aria-label={t.messagesTitle}>
      <Mail size={14} />
      {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
