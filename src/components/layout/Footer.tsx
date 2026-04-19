import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const columns = [
  {
    heading: "Services",
    links: [
      { label: "Same-day", href: "/#services" },
      { label: "Express", href: "/#services" },
      { label: "Scheduled", href: "/#services" },
      { label: "Bespoke routing", href: "/#services" },
    ],
  },
  {
    heading: "Operations",
    links: [
      { label: "Track parcel", href: "/tracking" },
      { label: "Dispatch center", href: "/dashboard" },
      { label: "API & integrations", href: "#" },
      { label: "Service status", href: "#" },
    ],
  },
  {
    heading: "Studio",
    links: [
      { label: "Our method", href: "/#why" },
      { label: "Voices", href: "/#reviews" },
      { label: "Careers", href: "#" },
      { label: "Press kit", href: "#" },
    ],
  },
];

const social = [
  { label: "Instagram", href: "#" },
  { label: "X / Twitter", href: "#" },
  { label: "LinkedIn", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-bg-deep pt-24">
      {/* Subtle glow */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-48"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(146,90,244,0.22), transparent 70%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Newsletter / CTA row */}
        <div className="grid grid-cols-1 items-start gap-10 border-b border-hairline pb-16 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <span className="inline-block h-px w-8 bg-ink-muted" />
              The Dispatch · weekly bulletin
            </div>
            <h3 className="mt-5 max-w-2xl font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1] tracking-[-0.02em] text-ink">
              Letters from the
              <br />
              <span className="italic text-brand-glow">road.</span>
            </h3>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
              Route notes, city spotlights and the occasional dispatch mishap —
              straight from our control room. No marketing, ever.
            </p>
          </div>

          <form className="w-full">
            <label
              htmlFor="newsletter"
              className="mb-3 block font-mono text-[11px] uppercase tracking-label text-ink-muted"
            >
              Subscribe
            </label>
            <div className="flex items-stretch overflow-hidden rounded-2xl border border-hairline-strong bg-bg-soft/60 transition focus-within:border-brand/60">
              <input
                id="newsletter"
                type="email"
                placeholder="you@studio.com"
                className="flex-1 bg-transparent px-5 py-4 font-mono text-sm text-ink placeholder:text-ink-dim focus:outline-none"
              />
              <button
                type="submit"
                className="bg-ink px-5 py-4 font-mono text-[11px] uppercase tracking-label text-bg transition hover:bg-brand hover:text-ink"
              >
                Join
              </button>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-label text-ink-dim">
              One email, every Thursday · Unsubscribe at will
            </p>
          </form>
        </div>

        {/* Sitemap */}
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-5">
          <div className="col-span-2 max-w-xs">
            <Link href="/" className="inline-flex items-baseline gap-2">
              <span className="font-display text-4xl italic leading-none text-ink">
                Skoro<span className="not-italic text-brand-glow">.</span>
              </span>
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">
              Couriered &mdash; not shipped. 133 Main Street, London EC1V&nbsp;7DU.
            </p>
            <ul className="mt-6 space-y-1.5 font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <li className="flex items-center gap-2">
                <span className="text-ink-dim">Email ·</span> contact@skoro.co
              </li>
              <li className="flex items-center gap-2">
                <span className="text-ink-dim">Dispatch ·</span> +44 20 4530 1121
              </li>
            </ul>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="font-mono text-[11px] uppercase tracking-label text-ink-dim">
                {col.heading}
              </h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="hover-underline text-sm text-ink transition"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col-reverse items-start justify-between gap-6 border-t border-hairline py-8 md:flex-row md:items-center">
          <p className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            © 2026 Skoro Couriers Ltd. All rights reserved. ·
            <span className="text-ink-muted"> Made along the M11 corridor</span>
          </p>

          <ul className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-label text-ink-muted">
            {social.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-1 transition hover:text-ink"
                >
                  {s.label}
                  <ArrowUpRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Ghost wordmark */}
        <div className="relative -mx-6 mt-4 overflow-hidden md:-mx-10">
          <span className="block select-none whitespace-nowrap text-center font-display text-[28vw] leading-[0.85] tracking-[-0.04em] text-ink/5">
            Skoro.
          </span>
        </div>
      </div>
    </footer>
  );
}
