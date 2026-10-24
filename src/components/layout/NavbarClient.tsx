"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X, User } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/#services", label: "Услуги" },
  { href: "/#tariffs", label: "Под задачу" },
  { href: "/#abons", label: "Тарифы" },
  { href: "/#cooperation", label: "О работе с нами" },
  { href: "/#contact", label: "Контакты" },
];

type AuthState = "unknown" | "in" | "out";

/**
 * Статус входа только для UI: сессия читается локально в браузере.
 * Защита ЛК — на сервере в dashboard/layout.tsx.
 */
function useAuthState(): AuthState {
  const [auth, setAuth] = useState<AuthState>("unknown");

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setAuth("out");
      return;
    }

    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuth(data.session ? "in" : "out");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session ? "in" : "out");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return auth;
}

export default function NavbarClient() {
  const auth = useAuthState();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-5 xl:px-10">
        {/* Логотип в потоке, а не absolute: раньше он перекрывал соседние элементы (P-25). */}
        <div className="flex items-center">
          <Link href="/" className="shrink-0">
            <Image
              src="/images/home/skoro_cropped.png"
              alt="Skoro"
              width={220}
              height={56}
              priority
              className="h-10 w-auto md:h-12"
            />
          </Link>
        </div>

        {/* Десктоп-меню */}
        <nav className="hidden xl:block">
          <ul className="flex items-center gap-6 whitespace-nowrap font-mono text-[11px] uppercase tracking-label text-ink-muted xl:gap-9">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover-underline transition hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          {auth === "in" ? (
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-label text-brand-glow transition hover:border-brand hover:bg-brand/20 md:inline-flex"
            >
              <User size={14} />
              Кабинет
            </Link>
          ) : (
            // Пока статус неизвестен, кнопка держит место невидимой — без сдвига вёрстки.
            <Link
              href="/login"
              aria-hidden={auth === "unknown" || undefined}
              tabIndex={auth === "unknown" ? -1 : undefined}
              className={`hidden whitespace-nowrap rounded-full border border-hairline-strong px-4 py-2 font-mono text-[11px] uppercase tracking-label text-ink/85 transition hover:border-ink/40 hover:text-ink md:inline-flex ${
                auth === "unknown" ? "invisible" : ""
              }`}
            >
              Sign in
            </Link>
          )}

          <Link
            href="/#contact"
            className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-label text-bg transition hover:bg-brand hover:text-ink"
          >
            {/* На телефоне полный текст не помещается рядом с логотипом и меню */}
            <span className="md:hidden">Заказать</span>
            <span className="hidden md:inline">Заказать доставку</span>
            <ArrowUpRight
              size={14}
              className="transition group-hover:rotate-45"
            />
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink xl:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Мобильный drawer */}
      {open && (
        <div className="border-t border-hairline bg-bg/95 backdrop-blur-xl xl:hidden">
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
              {auth === "in" ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="block rounded-full border border-brand/40 bg-brand/10 py-3 text-center text-brand-glow"
                >
                  Кабинет
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  aria-hidden={auth === "unknown" || undefined}
                  tabIndex={auth === "unknown" ? -1 : undefined}
                  className={`block rounded-full border border-hairline-strong py-3 text-center text-ink ${
                    auth === "unknown" ? "invisible" : ""
                  }`}
                >
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
