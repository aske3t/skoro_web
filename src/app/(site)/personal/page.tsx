import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContentPage } from "@/components/layout/ContentPage";
import { isPersonalDraft, personalHref, personalPages } from "@/lib/personal";

// Вход в версию сайта для частных клиентов (P-42): список подстраниц.
// TODO(владелец): вводный текст.
const LEAD = "";

export const metadata: Metadata = {
  title: "Для физлиц — Skoro",
  robots: !LEAD || personalPages.some(isPersonalDraft) ? { index: false } : undefined,
};

export default function PersonalPage() {
  return (
    <ContentPage
      backHref="/"
      backLabel="На главную"
      title="Для физлиц"
      lead={LEAD || "[Вводный текст для частных клиентов — текст владельца]"}
    >
      <ul className="mt-12 max-w-2xl divide-y divide-hairline border-y border-hairline">
        {personalPages.map(p => (
          <li key={p.slug}>
            <Link
              href={personalHref(p.slug)}
              className="group flex items-center justify-between gap-6 py-5 font-display text-2xl text-ink transition-colors hover:text-brand-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow md:text-3xl"
            >
              {p.title}
              <ArrowUpRight aria-hidden size={22} className="shrink-0 transition group-hover:rotate-45" />
            </Link>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
