import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContentPage, ctaClass } from "@/components/layout/ContentPage";

// Страница из блока доверия в футере (P-41).
// TODO(владелец): условия страховки — что покрывает, лимиты, как заявить случай. Пока пусто, страница закрыта от поисковиков.
const LEAD = "";

export const metadata: Metadata = {
  title: "Страховка отправления — Skoro",
  robots: LEAD ? undefined : { index: false },
};

export default function InsurancePage() {
  return (
    <ContentPage
      backHref="/"
      backLabel="На главную"
      title="Страховка отправления"
      lead={LEAD || "[Условия страховки — текст владельца]"}
    >
      <Link href="/#contact" className={ctaClass}>
        Оставить заявку
        <ArrowUpRight aria-hidden size={16} className="transition group-hover:rotate-45" />
      </Link>
    </ContentPage>
  );
}
