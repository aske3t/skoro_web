import Link from "next/link";
import Image from "next/image"
import { ArrowUpRight } from "lucide-react";

const columns = [
  {
    heading: "Services",
    links: [
      { label: "Same-day", href: "/#services" },
      { label: "Express", href: "/#services" },
      { label: "Scheduled", href: "/#services" },
      { label: "Cross city delivery", href: "/#services" },
    ],
  },
  {
    heading: "Info",
    links: [
      { label: "Cross city delivery", href: "/tracking" },
    ],
  },
  {
    heading: "Our partners",
    links: [
      { label: "Secret Flowers", href: "https://www.secretflowers.eu/en/" },
      { label: "Only Quality", href: "/#reviews" },
      { label: "Urban Car Detailing", href: "https://urbandetailing.cz/" },
    ],
  },
];

const social = [
  { label: "Instagram", href: "https://www.instagram.com/skoro.u.vas?igsh=Znp5ejlwbmk1ZHcy" },
  { label: "Facebook", href: "https://www.facebook.com/share/1Rty6EAmJt/?mibextid=wwXIfr" },
  { label: "Telegram", href: "#" },
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
              Thanks for making it
              <br />
              <span className="italic text-brand-glow">this far.</span>
            </h3>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
              Here, you’ll find our contact details and more about how we work.
              We’ll be happy to answer any questions.
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
              Get into our updates!
            </p>
          </form>
        </div>

        {/* Sitemap */}
        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-5">
          <div className="col-span-2 max-w-xs">
            <Link href="/" className="-ml-8 inline-flex items-center">
              <Image src="/images/home/skoro_cropped.png" alt="Skoro" width={220} height={56} priority className="h-10 w-auto md:h-12" />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">
              Your work &mdash; our delivery&nbsp;.
            </p>
            <ul className="mt-6 space-y-1.5 font-mono text-[11px] uppercase tracking-label text-ink-muted">
              <li className="flex items-center gap-2">
                <span className="text-ink-dim font-bold">Email ·</span> skorodelivery@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <span className="text-ink-dim font-bold">Телефон ·</span> +420 795 402 571
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
            © 2026 Skoro Couriers Ltd. All rights reserved
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
