import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ContentPage, ctaClass } from "@/components/layout/ContentPage";
import { findService, services } from "@/lib/services";

// Страница каждой услуги из футера. Пока шаблон: заголовок, плейсхолдер описания и заявка (P-41).
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map(s => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = findService((await params).slug);
  if (!service) return {};
  // Шаблон без описания в поиск не пускаем, чтобы не индексировать плейсхолдер.
  return { title: `${service.title} — Skoro`, robots: service.description ? undefined : { index: false } };
}

export default async function ServicePage({ params }: Props) {
  const service = findService((await params).slug);
  if (!service) notFound();

  return (
    <ContentPage
      backHref="/"
      backLabel="На главную"
      title={service.title}
      lead={service.description || "[Описание услуги — текст владельца]"}
    >
      <Link href="/#contact" className={ctaClass}>
        Оставить заявку
        <ArrowUpRight aria-hidden size={16} className="transition group-hover:rotate-45" />
      </Link>
    </ContentPage>
  );
}
