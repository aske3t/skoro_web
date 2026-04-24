"use client";

import ShipmentCard from "@/components/ornaments/ShipmentCard";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HeroTracking() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = trackingNumber.trim();
    if (!v) return;
    router.push(`/tracking?id=${encodeURIComponent(v)}`);
  }

  return (
    <section className="clip-bottom-slope relative overflow-hidden bg-bg pb-40 pt-32 md:pt-40">
      {/* Background stack */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="absolute inset-0 ambient-glow" />
        <div className="noise-layer" />
        {/* Ghost wordmark */}
        <div className="absolute -right-10 top-24 hidden select-none md:block">
          <span className="ghost-type font-display text-[22rem] leading-none">
            Skoro
          </span>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Left column — editorial text */}
        <div className="max-w-2xl">
          {/* Manifest tag */}
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
            <span className="inline-block h-px w-8 bg-ink-muted" />
            Manifest · Vol. 04
            <span className="rounded-full border border-hairline-strong px-2.5 py-0.5 text-brand-glow">
              Live
            </span>
          </div>

          {/* Editorial headline */}
          <h1 className="mt-7 font-display text-[clamp(3rem,8vw,6.5rem)] font-normal leading-[0.95] tracking-[-0.02em] text-ink">
            Курьер
            <br />
            <span className="italic text-brand-glow">по запросу</span>
            <br />
            вашего бизнеса.
          </h1>

          {/* Sub-copy */}
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-muted md:text-xl">
            Курьерская служба с ориентиром на ваш бизнес&nbsp;
            <span className="text-ink">и интересы</span>.<p>
              </p>Занимайтесь фирмой - сервис оставьте на нас.
          </p>

          {/* Console tracking input */}
          {/*<form
            onSubmit={onSubmit}
            className="group mt-10 flex w-full items-stretch overflow-hidden rounded-2xl border border-hairline-strong bg-bg-deep/80 shadow-card backdrop-blur transition focus-within:border-brand/60 focus-within:shadow-brand"
          >
            <div className="hidden items-center gap-2 border-r border-hairline px-5 font-mono text-[11px] uppercase tracking-label text-ink-dim sm:flex">
              <span className="h-2 w-2 rounded-full bg-brand-glow" />
              Track
            </div>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              type="text"
              spellCheck={false}
              placeholder="SK-XXXX-XXXX-XXXX"
              className="min-w-0 flex-1 bg-transparent px-5 py-5 font-mono text-base text-ink placeholder:text-ink-dim focus:outline-none md:text-lg"
            />*/}

          <button
            type="submit"
            className="group/btn relative mt-4 flex items-center gap-2 rounded-2xl bg-brand px-6 py-5 font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-brand-hover md:px-8 "
          >
            Связаться с нами
            <ArrowRight
              size={16}
              className="transition group-hover/btn:translate-x-1"
            />
          </button>
          
          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-hairline pt-6 md:max-w-lg">
            <Stat value="8,392" label="Dispatched today" />
            <Stat value="1,428" label="On the road" />
            <Stat value="99.8%" label="On-time rate" />
          </div>
        </div>

        {/* Right column — live shipment visual */}
        <div className="flex items-center justify-center lg:justify-end">
          <div className="relative">
            {/* Floating frame badges */}
            <div className="absolute -left-6 -top-6 hidden rotate-[-4deg] rounded-xl border border-hairline-strong bg-bg-raised/80 px-3 py-2 font-mono text-[10px] uppercase tracking-label text-ink-muted backdrop-blur md:block">
              Courier · Aisha K.
            </div>
            <div className="absolute -bottom-5 -right-5 hidden rotate-[3deg] rounded-xl border border-brand/40 bg-brand/15 px-3 py-2 font-mono text-[10px] uppercase tracking-label text-brand-glow backdrop-blur md:block">
              ETA locked
            </div>
            <ShipmentCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl leading-none text-ink md:text-4xl">
        {value}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {label}
      </div>
    </div>
  );
}
