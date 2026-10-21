"use client";

import { Building2, User, type LucideIcon } from "lucide-react";
import { setAudience, useAudience, type Audience } from "@/lib/audience";

const OPTIONS: { value: Audience; label: string; Icon: LucideIcon }[] = [
  { value: "business", label: "Я — бизнес", Icon: Building2 },
  { value: "personal", label: "Я — частное лицо", Icon: User },
];

/**
 * Выбор версии сайта: бизнес или частное лицо. Монолитный переключатель:
 * подсветка выбранного варианта — один бегунок, который плавно переезжает.
 * `hero` — в первом экране; `compact` — у формы заявки.
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
  const index = OPTIONS.findIndex((o) => o.value === audience);

  return (
    <div
      role="radiogroup"
      aria-label="Кто вы"
      className={`relative grid w-full grid-cols-2 rounded-full border border-hairline-strong bg-bg-soft/60 p-1 backdrop-blur-sm sm:inline-grid sm:w-auto ${className}`}
    >
      {/* Бегунок: ширина одной ячейки, сдвиг на ширину ячейки к выбранному варианту. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-brand shadow-brand transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = audience === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setAudience(value)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap sm:gap-2 rounded-full transition-colors duration-300 ${
              hero ? "px-2 py-2 text-[13px] sm:px-5 sm:text-sm" : "px-2 py-1.5 text-[13px] sm:px-4"
            } ${active ? "text-ink" : "text-ink-muted hover:text-ink"}`}
          >
            <Icon size={hero ? 16 : 14} aria-hidden className="shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
