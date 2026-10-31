import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

// Общий шаблон текстовых подстраниц (услуги, версия для частных клиентов):
// ссылка назад, заголовок, вводный абзац и содержимое страницы.
type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  lead: string;
  children?: ReactNode;
};

export function ContentPage({ backHref, backLabel, title, lead, children }: Props) {
  return (
    <section className="relative overflow-hidden bg-bg pb-24 pt-36 md:pb-32 md:pt-44">
      <div aria-hidden className="absolute inset-0 grid-lines opacity-40" />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-sm text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow"
        >
          <ArrowLeft aria-hidden size={16} />
          {backLabel}
        </Link>

        <h1 className="mt-8 max-w-4xl text-balance font-display text-[clamp(2.25rem,6vw,4.75rem)] leading-[1] tracking-[-0.02em] text-ink">
          {title}
        </h1>

        <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-ink-muted md:text-lg">{lead}</p>

        {children}
      </div>
    </section>
  );
}

export const ctaClass =
  "group mt-10 inline-flex items-center gap-2.5 rounded-full bg-brand px-7 py-4 text-sm font-medium text-ink transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow";
