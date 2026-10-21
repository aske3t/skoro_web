"use client";

import { Building2, User, type LucideIcon } from "lucide-react";
import { setAudience, useAudience, type Audience } from "@/lib/audience";

const OPTIONS: { value: Audience; label: string; Icon: LucideIcon }[] = [
  { value: "business", label: "Я — бизнес", Icon: Building2 },
  { value: "personal", label: "Я — частное лицо", Icon: User },
];

/**
 * Выбор версии сайта: бизнес или частное лицо. От выбора зависят версии сайта (форма заявки уже сейчас).
 * `hero` — крупный, в первом экране; `compact` — у формы заявки.
 */
export function AudienceSwitch({
  variant = "compact",
  className = "",
}: {
  variant?: "hero" | "compact";
  className?: string;
}) {
  const audience = useAudience();
  const hero = variant === "hero";

  return (
    <div
      role="radiogroup"
      aria-label="Кто вы"
      className={`flex w-full gap-1.5 rounded-2xl border border-hairline-strong bg-bg-soft/60 p-1.5 backdrop-blur-sm sm:w-auto sm:rounded-full ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = audience === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setAudience(value)}
            className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap sm:gap-2.5 rounded-xl transition sm:rounded-full ${
              hero
                ? "px-2.5 py-3 text-sm sm:px-7 sm:py-4 sm:text-lg"
                : "px-4 py-2.5 text-sm"
            } ${
              active
                ? "bg-brand text-ink shadow-brand"
                : "text-ink-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Icon size={hero ? 18 : 16} aria-hidden className="shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
