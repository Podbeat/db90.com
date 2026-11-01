"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

// « Mon classeur » se compose désormais dans « Ma collection » : les anciens liens y mènent,
// éditeur ouvert.
export default function ClasseurRedirect() {
  const { t } = useLanguage();
  const router = useRouter();
  useEffect(() => {
    router.replace("/compte/collection?classeur=1#classeur");
  }, [router]);
  return <div className="empty-state">{t.loading}</div>;
}
