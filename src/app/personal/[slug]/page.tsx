import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Plus } from "lucide-react";
import { AudienceLink } from "@/components/layout/AudienceLink";
import { ContentPage, ctaClass } from "@/components/layout/ContentPage";
import { faq, findPersonalPage, isPersonalDraft, personalPages } from "@/lib/personal";

// Подстраницы версии для частных клиентов (P-42): цена, как заказать, частые вопросы. Пока шаблоны.
export const dynamicParams = false;

export function generateStaticParams() {
  return personalPages.map(p => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findPersonalPage((await params).slug);
  if (!page) return {};
  return { title: `${page.title} — Skoro`, robots: isPersonalDraft(page) ? { index: false } : undefined };
}

export default async function PersonalSubpage({ params }: Props) {
  const page = findPersonalPage((await params).slug);
  if (!page) notFound();

  return (
    <ContentPage
      backHref="/personal"
      backLabel="Для физлиц"
      title={page.title}
      lead={page.description || "[Текст страницы — заполнит владелец]"}
    >
      {page.slug === "faq" && (
        <div className="mt-12 max-w-3xl divide-y divide-hairline border-y border-hairline">
          {faq.map((item, i) => (
            <details key={i} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 text-lg text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow [&::-webkit-details-marker]:hidden">
                {item.question || `[Вопрос ${i + 1}]`}
                <Plus aria-hidden size={20} className="shrink-0 text-brand-glow transition-transform group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-6 text-base leading-relaxed text-ink-muted">
                {item.answer || `[Ответ ${i + 1}]`}
              </p>
            </details>
          ))}
        </div>
      )}

      {/* Заявка отсюда открывает форму сразу в варианте «Частное лицо» */}
      <AudienceLink audience="personal" href="/#contact" className={ctaClass}>
        Оставить заявку
        <ArrowUpRight aria-hidden size={16} className="transition group-hover:rotate-45" />
      </AudienceLink>
    </ContentPage>
  );
}
