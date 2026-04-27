"use client";

import { useReveal } from "@/lib/useReveal";
import {
  AlertTriangle,
  Clock,
  FileText,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type Problem = {
  ordinal: string;
  title: string;
  tagline: string;
  description: string;
  pros: string[];
  cons: string[];
  icon: LucideIcon;
};

const problems: Problem[] = [
  {
    ordinal: "01",
    title: "Агрегаторы - нестабильно и непрофессионально.",
    tagline: "Проблема · Люди",
    description:
      "Непонятное и нестабильное ценообразование. Водители не заинтересованы в качестве - для них вы один заказ из сотни, приехал и забыл.\nСпектр услуг сильно ограничен - такси не решает задачи вашего бизнеса.",
    pros: [
      "Установленная тарифная сетка и индивидуальные договоренности",
      "Профессиональный и клиентоориентированный подход",
      "Возьмем много задач в один маршрут",
    ],
    cons: ["Подключение и регламенты — 1 рабочий день"],
    icon: AlertTriangle,
  },
  {
    ordinal: "02",
    title: "Свой автопарк - дорого и рискованно.",
    tagline: "Проблема · Затраты",
    description:
      "Амортизация, поломки, зарплаты курьерам, страховки, простои. Когда нет постоянного потока заказов - быстрый выход в минус.",
    pros: [
      "У нас нет оклада - платите только за выполненную работу.",
      "Мы следим за своим автопарком - всегда готовый транспорт без вашего участия.",
      "Работаем без выходных и больничных, у нас всегда есть курьер на замену.",
    ],
    cons: ["В час-пик — повышенный тариф"],
    icon: Clock,
  },
  {
    ordinal: "03",
    title: "Доставка на сотрудниках - ложная экономия.",
    tagline: "Проблема · Фокус",
    description:
      "Час работы вашего специалиста стоит дороже часа курьера. Каждый выезд «между делом» — это оплачиваемое время, которое можно потратить эффективнее.",
    pros: [
      "Ваш фокус на бизнесе - мы возьмем на себя доставку.",
      "Отчёт о выполнении по каждому заказу",
      "Фиксированный результат вместо «как получится»",
    ],
    cons: ["В сезонный пик разово может быть дороже штата"],
    icon: Wallet,
  },
  {
    ordinal: "04",
    title: "Курьер-подработчик — риск без защиты.",
    tagline: "Проблема · Риски",
    description:
      "Сосед, знакомый с машиной за наличку, студент, доставляющий заказы после учебы. На бумаге дешево - но без договора, без страховки и ответственности. Потерял посылку, попал в ДТП, не вышел на заказ - проблемы вашего бизнеса.",
    pros: [
      "Официальный B2B партнер с юридической ответственностью",
      "Страхование груза и ответственности перевозчика",
      "Системная работа на постоянной основе",
    ],
    cons: ["Бумажные оригиналы возим отдельным рейсом"],
    icon: FileText,
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="clip-both-slopes relative -mt-[72px] overflow-hidden bg-section pb-32 pt-36"
    >
      {/* Texture */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-section-warm via-section to-section-shadow"
      />
      <div className="noise-layer" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(14,8,22,0.18), transparent 40%), radial-gradient(circle at 80% 100%, rgba(146,90,244,0.25), transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Section header */}
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-label text-bg/80">
              <span className="inline-block h-px w-8 bg-bg/50" />
              Problems · 04
            </div>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] font-normal leading-[1] tracking-[-0.02em] text-bg">
              Почему мы
              <br />
              <span className="italic">нужны?</span>
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-bg/80 md:text-lg">
            Четыре узких места, с которыми чаще всего приходят к нам. Отметьте
            знакомое — с него и начнём.
          </p>
        </div>

        {/* Counter strip */}
        <div className="mt-12 flex items-center gap-5 border-y border-bg/15 py-3.5 font-mono text-[11px] uppercase tracking-label text-bg/60">
          <span>Обнаружено</span>
          <span className="font-display text-[22px] italic leading-none text-bg">
            04
          </span>
          <span className="h-px flex-1 bg-bg/10" />
          <span className="hidden sm:inline">Обновлено · Q2 · 2026</span>
        </div>

        {/* Cards — asymmetric 2x2 */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-5">
          {problems.map((p, i) => (
            <ProblemCard
              key={p.ordinal}
              problem={p}
              delay={i * 120}
              offsetClass={
                i === 1
                  ? "md:translate-y-10"
                  : i === 2
                    ? "md:-translate-y-6"
                    : i === 3
                      ? "md:translate-y-4"
                      : ""
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  problem,
  delay,
  offsetClass,
}: {
  problem: Problem;
  delay: number;
  offsetClass: string;
}) {
  const ref = useReveal<HTMLElement>();
  const Icon = problem.icon;
  return (
    <article
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal group relative overflow-hidden rounded-[1.75rem] border border-bg/15 bg-bg p-7 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand/40 hover:shadow-brand md:p-8 ${offsetClass}`}
    >
      <div className="noise-layer rounded-[1.75rem]" />

      {/* Top row */}
      <div className="relative flex items-start justify-between">
        <span className="font-display text-6xl italic leading-none text-brand-glow/90 md:text-7xl">
          {problem.ordinal}
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline-strong bg-bg-soft text-ink transition group-hover:border-brand group-hover:text-brand-glow">
          <Icon size={20} />
        </span>
      </div>

      {/* Title */}
      <div className="relative mt-12">
        <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          {problem.tagline}
        </div>
        <h3 className="mt-3 font-display text-4xl leading-none text-ink md:text-[2.5rem]">
          {problem.title}
        </h3>
      </div>

      {/* Description */}
      <p className="relative mt-5 max-w-[44ch] text-sm leading-relaxed text-ink-muted">
        {problem.description}
      </p>

      {/* Solution — pros / cons */}
      <div className="relative mt-8 border-t border-hairline pt-5">
        <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
          Решение
        </div>

        <ul className="mt-3 space-y-1.5 text-sm text-ink">
          {problem.pros.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-glow" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {problem.cons.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
            {problem.cons.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-[10px] h-px w-2.5 shrink-0 bg-ink-dim" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
