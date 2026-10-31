import Link from "next/link";
import {
  CreditCard,
  Facebook,
  FileText,
  Instagram,
  Languages,
  Mail,
  Newspaper,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { personalHref, personalPages } from "@/lib/personal";
import { serviceHref, services } from "@/lib/services";
import { FooterScene } from "./FooterScene";
import { NewsletterForm } from "./NewsletterForm";

// Реквизиты по ARES (проверено 2026-10-31): физлицо-предприниматель, запись в RŽP активна, DPH не зарегистрирован.
// Формулировки по-чешски, как в реестре; перевод — вместе с языковыми версиями.
const COMPANY = {
  name: "Platon Chernov",
  ico: "22360859",
  seat: "Nové sady 988/2, 602\u00a000 Brno", // неразрывный пробел: индекс не рвётся на телефоне
  register: "Fyzická osoba zapsaná v živnostenském rejstříku",
  vat: "Neplátce DPH",
};

// TODO(владелец): страницы юридических документов. Пока href пуст, пункт стоит без ссылки.
// ČOI — официальная страница о внесудебном решении потребительских споров (ADR).
const legal: { label: string; href: string; external?: boolean }[] = [
  { label: "Условия оказания услуг", href: "" },
  { label: "Порядок рекламаций", href: "" },
  { label: "Защита персональных данных", href: "" },
  { label: "Настройки cookies", href: "" },
  { label: "Решение споров · ČOI", href: "https://coi.gov.cz/informace-o-adr/", external: true },
];

// Разделы лендинга для бизнес-клиентов.
const business = [
  { label: "Тарифы", href: "/#tariffs" },
  { label: "Абонементы", href: "/#abons" },
  { label: "Индивидуально", href: "/#individual" },
  { label: "О работе с нами", href: "/#cooperation" },
];

// TODO(владелец): адрес блога. Пока href пуст, пункт стоит без ссылки.
const contacts: { icon: LucideIcon; label: string; href: string; external?: boolean }[] = [
  { icon: Phone, label: "+420 795 402 571", href: "tel:+420795402571" },
  { icon: Mail, label: "skorodelivery@gmail.com", href: "mailto:skorodelivery@gmail.com" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/skoro.u.vas", external: true },
  { icon: Send, label: "Telegram", href: "https://t.me/skorouvas", external: true },
  { icon: Facebook, label: "Facebook", href: "https://www.facebook.com/profile.php?id=61589239295903", external: true },
  { icon: Newspaper, label: "Наш блог", href: "" },
  { icon: UserRound, label: "Личный кабинет", href: "/dashboard" },
];

// TODO(владелец): языки обслуживания — подтвердить и вписать вместо плейсхолдера.
// Страховка и договор ведут на свои страницы (/insurance, /contract).
const trust: { icon: LucideIcon; label: string; href?: string }[] = [
  { icon: ShieldCheck, label: "Страховка отправления", href: "/insurance" },
  { icon: FileText, label: "Работаем по договору", href: "/contract" },
  { icon: CreditCard, label: "Карта, Apple Pay, банковский перевод или наличными курьеру" },
  { icon: Languages, label: "[Языки обслуживания]" },
];

// У Only Quality пока нет своей страницы — название без ссылки.
const partners: { label: string; href?: string }[] = [
  { label: "Secret Flowers", href: "https://www.secretflowers.eu/en/" },
  { label: "Only Quality" },
  { label: "Urban Car Detailing", href: "https://urbandetailing.cz/" },
];

const focusRing =
  "rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-glow";
const linkClass = `${focusRing} text-ink underline-offset-4 decoration-brand-glow/60 transition-colors hover:underline focus-visible:underline`;
const titleClass = "text-sm text-ink-muted";

export default function Footer() {
  const requisites = [
    COMPANY.name || "[Наименование]",
    `IČO ${COMPANY.ico || "[00000000]"}`,
    COMPANY.seat || "[Адрес]",
    COMPANY.register || "[Запись в реестре]",
    COMPANY.vat || "[Статус плательщика DPH]",
  ];

  return (
    <footer className="relative overflow-hidden bg-bg-deep pt-20 md:pt-24">
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
        {/* 1 · Рассылка */}
        <div className="border-b border-hairline pb-14">
          <NewsletterForm />
        </div>

        {/* 2 · Слоган, услуги, разделы для бизнеса и для физлиц, контакты */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 py-14 lg:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_1.2fr]">
          <div className="col-span-2 lg:col-span-1">
            {/* Слоган с визитки, как в hero: Barlow Condensed, акцент на «kurýr» */}
            <p lang="cs" className="font-tagline text-[2rem] font-extrabold italic leading-none text-ink md:text-[2.25rem]">
              Více než <span className="text-brand-glow">kurýr</span>
            </p>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">Ваша работа — наша доставка.</p>
          </div>

          <nav aria-labelledby="footer-services" className="col-span-2 sm:col-span-1">
            <h2 id="footer-services" className={titleClass}>Услуги</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {services.map(s => (
                <li key={s.slug}>
                  <Link href={serviceHref(s.slug)} className={linkClass}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-business">
            <h2 id="footer-business" className={titleClass}>Для бизнеса</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {business.map(l => (
                <li key={l.label}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Версия сайта для частных клиентов — отдельные страницы, а не якоря лендинга (P-42) */}
          <nav aria-labelledby="footer-personal">
            <h2 id="footer-personal" className={titleClass}>Для физлиц</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {personalPages.map(p => (
                <li key={p.slug}>
                  <Link href={personalHref(p.slug)} className={linkClass}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-2 min-w-0 sm:col-span-1">
            <h2 className={titleClass}>Контакты</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {contacts.map(({ icon: Icon, label, href, external }) => {
                const content = (
                  <>
                    <Icon aria-hidden size={16} className="shrink-0 text-brand-glow" />
                    {/* Почта длиннее колонки на телефоне: переносим перед «@», а если не влезет и так — где угодно */}
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {label.includes("@") ? (
                        <>
                          {label.slice(0, label.indexOf("@"))}
                          <wbr />
                          {label.slice(label.indexOf("@"))}
                        </>
                      ) : (
                        label
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                        className={`inline-flex max-w-full items-center gap-2.5 tabular-nums ${linkClass}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="inline-flex max-w-full items-center gap-2.5 text-ink">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 3 · Доверие и партнёры */}
        <div className="flex flex-col gap-5 border-t border-hairline py-8">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink">
            {trust.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                {href ? (
                  <Link href={href} className={`inline-flex items-center gap-2.5 ${linkClass}`}>
                    <Icon aria-hidden size={16} className="shrink-0 text-brand-glow" />
                    {label}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2.5">
                    <Icon aria-hidden size={16} className="shrink-0 text-brand-glow" />
                    {label}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <p className="text-sm text-ink-muted">
            Партнёры:{" "}
            {partners.map((p, i) => (
              <span key={p.label}>
                {i > 0 && ", "}
                {p.href ? (
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {p.label}
                  </a>
                ) : (
                  <span className="text-ink">{p.label}</span>
                )}
              </span>
            ))}
          </p>
        </div>
      </div>

      <FooterScene />

      {/* 4 · Юридическая лента */}
      <div className="relative border-t border-hairline">
        <div className="mx-auto max-w-[1400px] space-y-3 px-6 py-6 text-[13px] leading-relaxed text-ink-dim md:px-10">
          <p lang="cs">{requisites.join(" · ")}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map(l => (
              <li key={l.label}>
                {l.href ? (
                  <a
                    href={l.href}
                    {...(l.external && { target: "_blank", rel: "noopener noreferrer" })}
                    className={`${focusRing} text-ink-muted underline-offset-4 hover:text-ink hover:underline`}
                  >
                    {l.label}
                  </a>
                ) : (
                  l.label
                )}
              </li>
            ))}
            <li>© {new Date().getFullYear()} Skoro</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
