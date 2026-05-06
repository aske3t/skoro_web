"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

type Review = {
  quote: string;
  author: string;
  role: string;
  code: string;
};

const reviews: Review[] = [
  {
    quote:
      "Our studio ships signed first editions internationally — Skoro is the first courier we've trusted with provenance. The live manifest alone has paid for itself twice over.",
    author: "Hana Okafor",
    role: "Curator · Verso Editions",
    code: "R-01/04",
  },
  {
    quote:
      "We went from Friday panic to zero late deliveries in one quarter. Their dispatchers answer in minutes, not hours. It's the ops team I wish I'd hired.",
    author: "Marcus Leibniz",
    role: "COO · Terraform Kitchen",
    code: "R-02/04",
  },
  {
    quote:
      "The couriers wear gloves. That sounds small. When you're moving a lace bodice across three cities, that's everything.",
    author: "Amira Souissi",
    role: "Designer · Maison Souissi",
    code: "R-03/04",
  },
  {
    quote:
      "Every parcel from us to our collectors is scanned, photographed, and signed. Skoro treats art like we do — not like cargo.",
    author: "Julien Rose",
    role: "Director · Atelier Rose",
    code: "R-04/04",
  },
];

export default function Reviews() {
  const [index, setIndex] = useState(0);
  const current = reviews[index];
  const total = reviews.length;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  return (
    <section
      id="reviews"
      className="clip-top-slope relative -mt-[72px] overflow-hidden bg-section pb-28 pt-36"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-section-warm to-section-shadow"
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Section header */}
        <div className="flex items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-bg/80">
              <span className="inline-block h-px w-8 bg-bg/50" />
              Voices · from our ledger
            </div>
            <h2 className="mt-5 font-display text-[clamp(2.25rem,6vw,4.5rem)] font-normal leading-[1] tracking-[-0.02em] text-bg">
              Доставлено
              <br />
              <span className="italic">с качеством.</span>
            </h2>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <NavButton onClick={prev} label="Previous">
              <ArrowLeft size={18} />
            </NavButton>
            <NavButton onClick={next} label="Next">
              <ArrowRight size={18} />
            </NavButton>
          </div>
        </div>
        
        {/* Feature quote */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Main quote */}
          <figure className="relative">
            <span
              aria-hidden
              className="absolute -top-10 left-0 font-display text-[10rem] leading-none text-bg/10 md:text-[14rem]"
            >
              &ldquo;
            </span>
            <blockquote className="relative pt-8 font-display text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.15] tracking-[-0.01em] text-bg">
              {current.quote}
            </blockquote>
            <figcaption className="mt-10 flex items-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg font-display text-lg italic text-brand-glow">
                {current.author.charAt(0)}
              </div>
              <div>
                <div className="font-display text-lg italic text-bg">
                  {current.author}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-label text-bg/70">
                  {current.role}
                </div>
              </div>
              <div className="ml-auto hidden font-mono text-[10px] uppercase tracking-label text-bg/60 md:block">
                {current.code}
              </div>
            </figcaption>
          </figure>

          {/* Small quote stack */}
          <aside className="space-y-4">
            {reviews
              .filter((_, i) => i !== index)
              .slice(0, 3)
              .map((r, i) => (
                <button
                  key={r.author}
                  onClick={() =>
                    setIndex(reviews.findIndex((x) => x.author === r.author))
                  }
                  className="group block w-full rounded-2xl border border-bg/15 bg-bg/10 p-5 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-bg/30 hover:bg-bg/20"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <p className="line-clamp-2 text-sm leading-relaxed text-bg/90">
                    {r.quote}
                  </p>
                  <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-label text-bg/70">
                    <span>{r.author}</span>
                    <span>{r.code}</span>
                  </div>
                </button>
              ))}
          </aside>
        </div>

        {/* Mobile nav + progress */}
        <div className="mt-12 flex items-center justify-between">
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-label text-bg/80">
            <span className="font-display text-2xl italic text-bg">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="mx-1 h-px w-6 bg-bg/60" />
            {String(total).padStart(2, "0")}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <NavButton onClick={prev} label="Previous">
              <ArrowLeft size={18} />
            </NavButton>
            <NavButton onClick={next} label="Next">
              <ArrowRight size={18} />
            </NavButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-bg/25 bg-bg/10 text-bg transition hover:bg-bg hover:text-section-warm"
    >
      {children}
    </button>
  );
}
