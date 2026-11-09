import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContentPage, ctaClass } from "@/components/layout/ContentPage";

// Страница из блока доверия в футере (P-41).
// TODO(владелец): как работаем по договору — для кого, что фиксируем, как заключить. Пока пусто, страница закрыта от поисковиков.
const LEAD = "";

export const metadata: Metadata = {
  title: "Работаем по договору — Skoro",
  robots: LEAD ? undefined : { index: false },
};

export default function ContractPage() {
  return (
    <ContentPage
      backHref="/"
      backLabel="На главную"
      title="Работаем по договору"
      lead={LEAD || "[Условия работы по договору — текст владельца]"}
    >
      <Link href="/#contact" className={ctaClass}>
        Обсудить договор
        <ArrowUpRight aria-hidden size={16} className="transition group-hover:rotate-45" />
      </Link>
    </ContentPage>
  );
}
