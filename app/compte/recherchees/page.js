"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

// Les cartes recherchées sont désormais une section de « Ma collection ».
export default function RechercheesRedirect() {
  const { t } = useLanguage();
  const router = useRouter();
  useEffect(() => {
    router.replace("/compte/collection#recherchees");
  }, [router]);
  return <div className="empty-state">{t.loading}</div>;
}
