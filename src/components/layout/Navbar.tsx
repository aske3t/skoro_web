"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image"

const links = [
  { href: "/tracking", label: "Track" },
  { href: "/#services", label: "Services" },
  { href: "/#why", label: "Method" },
  { href: "/#reviews", label: "Voices" },
];

type Audience = "personal" | "business";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [audience, setAudience] = useState<Audience>("personal");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-hairline bg-bg/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      {/* Wordmark — absolutely positioned, outside the centered flex row */}
      <Link href="/" className="group absolute left-4 md:left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 z-10">
        <Image src="/images/home/skoro_cropped.png" alt="Skoro" width={220} height={56} priority className="h-10 w-auto md:h-12" />
      </Link>

      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 pl-2 pr-5 py-4 md:pl-4 md:pr-10 md:py-5">
        {/* Audience toggle — holds the slot where the logo used to sit in flex */}
        <div className="hidden items-center rounded-full border border-hairline-strong bg-bg-soft/60 p-1 font-mono text-[10px] uppercase tracking-label md:flex">
          <button
            onClick={() => setAudience("personal")}
            className={`rounded-full px-3.5 py-1.5 transition ${
              audience === "personal"
                ? "bg-ink text-bg"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Для физлиц
          </button>
          <button
            onClick={() => setAudience("business")}
            className={`rounded-full px-3.5 py-1.5 transition ${
              audience === "business"
                ? "bg-ink text-bg"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Для бизнеса
          </button>
        </div>
        {/* Mobile spacer — keeps layout balanced when toggle is hidden */}
        <div aria-hidden className="h-10 w-[150px] md:hidden" />

        {/* Desktop nav */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-9 font-mono text-[11px] uppercase tracking-label text-ink-muted">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover-underline transition hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full border border-hairline-strong px-4 py-2 font-mono text-[11px] uppercase tracking-label text-ink/85 transition hover:border-ink/40 hover:text-ink md:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-label text-bg transition hover:bg-brand hover:text-ink"
          >
            Ship now
            <ArrowUpRight
              size={14}
              className="transition group-hover:rotate-45"
            />
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-hairline bg-bg/95 backdrop-blur-xl md:hidden">
          <ul className="mx-auto flex max-w-[1400px] flex-col gap-1 px-5 py-4 font-mono text-[12px] uppercase tracking-label text-ink-muted">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-hairline py-3 transition hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-full border border-hairline-strong py-3 text-center text-ink"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
