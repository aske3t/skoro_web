"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/dashboard", label: "Обзор" },
  { href: "/dashboard/orders", label: "Заказы" },
  { href: "/dashboard/payments", label: "Платежи" },
  { href: "/dashboard/subscribition", label: "Абонемент" },
];

export default function DashboardTabs () {
    const pathname = usePathname();


 return (
    <nav className="mt-8 flex flex-wrap gap-2 border-b border-hairline">
      {tabs.map((t) => {
        // /dashboard сравниваем точно (иначе всегда был бы активен),
        // вложенные — по началу пути.
        const active =
          t.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-label transition ${
              active
                ? "border-brand text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}