"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getVisitorId() {
  try {
    let id = window.localStorage.getItem("dbnonoff90s-visitor");
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem("dbnonoff90s-visitor", id);
    }
    return id;
  } catch (e) {
    return null;
  }
}

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Ne suit pas les pages d'administration : ce sont vos propres visites, pas celles des lecteurs.
    if (pathname && pathname.startsWith("/admin")) return;

    const visitorId = getVisitorId();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_view", path: pathname, visitorId }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
