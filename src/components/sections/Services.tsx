"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRight, Check } from "lucide-react";
import { requestLeadPrefill } from "@/lib/leads/prefill";
import { useReveal } from "@/lib/useReveal";

type Problem = {
  id: string;
  /** Как клиент возит сейчас: уходит в форму заявки, если карточку отметили. */
  current: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
};

// Неразрывный пробел перед тире ( ) — чтобы тире не начинало строку.
const problems: Problem[] = [
  {
    id: "aggregators",
    current: "агрегаторы",
    title: "Агрегаторы — нестабильно и непрофессионально.",
    description:
      "Непонятное и нестабильное ценообразование. Водители не заинтересованы в качестве — для них вы один заказ из сотни, приехал и забыл.\nСпектр услуг сильно ограничен — такси не решает задачи вашего бизнеса.",
    pros: [
      "Установленная тарифная сетка и индивидуальные договорённости",
      "Профессиональный и клиентоориентированный подход",
      "Возьмём много задач в один маршрут",
    ],
    cons: ["Подключение и регламенты — 1 рабочий день"],
  },
  {
    id: "own-fleet",
    current: "свой автопарк",
    title: "Свой автопарк — дорого и рискованно.",
    description:
      "Амортизация, поломки, зарплаты курьерам, страховки, простои. Когда нет постоянного потока заказов — быстрый выход в минус.",
    pros: [
      "У нас нет оклада — платите только за выполненную работу",
      "Мы следим за своим автопарком — всегда готовый транспорт без вашего участия",
      "Работаем без выходных и больничных, у нас всегда есть курьер на замену",
    ],
    cons: ["Представляемся от имени вашей доставки"],
  },
  {
    id: "staff",
    current: "свои сотрудники",
    title: "Доставка на сотрудниках — ложная экономия.",
    description:
      "Час работы вашего специалиста стоит дороже часа курьера. Каждый выезд «между делом» — это оплачиваемое время, которое можно потратить эффективнее.",
    pros: [
      "Ваш фокус на бизнесе — мы возьмём на себя доставку",
      "Отчёт о выполнении по каждому заказу",
      "Фиксированный рабочий график и результат",
    ],
    cons: ["Автоматизируем рабочие процессы и экономим ваше время"],
  },
  {
    id: "freelancers",
    current: "курьеры-подработчики",
    title: "Курьер-подработчик — риск без защиты.",
    description:
      "Знакомый с машиной за наличку, студент, доставляющий заказы после учёбы. На бумаге дёшево — но без договора, без страховки и ответственности. Потерял посылку, попал в ДТП, не вышел на заказ — проблемы вашего бизнеса.",
    pros: [
      "Официальный B2B-партнёр с юридической ответственностью",
      "Страхование груза и ответственности перевозчика",
      "Системная работа на постоянной основе",
    ],
    cons: ["Ответственный подход к доставке и надежность"],
  },
];

export default function Services() {
  // Отмеченные карточки: «это про нас». Уходят в форму по кнопке «Обсудить с менеджером».
  const [chosen, setChosen] = useState<string[]>([]);
  const chosenNames = problems.filter((p) => chosen.includes(p.id)).map((p) => p.current);

  function toggle(id: string) {
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function discuss() {
    requestLeadPrefill({
      kind: "question",
      message: chosenNames.length > 0 ? `Как возим сейчас: ${chosenNames.join(", ")}.` : "",
    });
  }

  return (
    <section
      id="services"
      lang="ru"
      aria-labelledby="services-title"
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
          <h2
            id="services-title"
            className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] leading-[1] tracking-[-0.02em] text-bg"
          >
            Почему мы
            <br />
            <span className="italic">нужны?</span>
          </h2>
          {/* Пояснение и призыв раздельно; значок повторяет переключатель на карточках */}
          <div className="max-w-sm text-base leading-relaxed md:text-lg">
            <p className="text-pretty text-bg/75">
              Четыре узких места, с которыми чаще всего приходят к нам.
            </p>
            <p className="mt-3 flex items-start gap-2.5 font-medium text-bg">
              <span
                aria-hidden
                className="mt-[0.2em] flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand text-ink"
              >
                <Check size={14} strokeWidth={3} />
              </span>
              <span>Отметьте знакомое&nbsp;— с&nbsp;него и&nbsp;начнём.</span>
            </p>
          </div>
        </div>

        {/* Cards — 2x2, каждая отмечается целиком */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-5">
          {problems.map((p, i) => (
            <ProblemCard
              key={p.id}
              problem={p}
              // В две колонки правая карточка появляется чуть позже левой; в одну — без задержки.
              delay={(i % 2) * 120}
              checked={chosen.includes(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>

        {/* Итог выбора и переход к заявке. Без JS — обычная ссылка на форму. */}
        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <a
            href="#contact"
            onClick={discuss}
            className="group/btn inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl bg-bg px-6 py-5 font-mono text-[11px] uppercase tracking-label text-ink transition hover:bg-bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bg md:px-8"
          >
            Обсудить с менеджером
            <ArrowRight aria-hidden size={16} className="transition group-hover/btn:translate-x-1 motion-reduce:transition-none" />
          </a>
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  problem,
  delay,
  checked,
  onToggle,
}: {
  problem: Problem;
  delay: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const ref = useReveal<HTMLDivElement>();
  const inputId = `problem-${problem.id}`;
  return (
    // Появление — на обёртке: transition у .reveal перебил бы плавный hover самой карточки.
    // Без анимаций — только проявление, без сдвига.
    <div
      ref={ref}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className="reveal motion-reduce:transform-none md:[transition-delay:var(--reveal-delay)]"
    >
      <article className="group relative h-full rounded-[1.75rem] border border-bg/15 bg-bg p-6 shadow-card transition-[border-color,box-shadow] duration-300 [container-type:inline-size] hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:shadow-brand has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-bg sm:p-7 md:p-8">
        {/* Переключатель. Подпись растянута на всю карточку: кликается целиком. */}
        <input id={inputId} type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
        <label
          htmlFor={inputId}
          className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-ink-muted transition-colors after:absolute after:inset-0 after:rounded-[1.75rem] after:content-[''] group-has-[:checked]:text-ink"
        >
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-md border border-ink-muted/60 transition-colors group-hover:border-brand/60 group-has-[:checked]:border-brand group-has-[:checked]:bg-brand"
          >
            <Check size={14} strokeWidth={3} className="opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
          </span>
          Это про нас<span className="sr-only">: {problem.current}</span>
        </label>

        <h3 className="mt-6 text-balance font-display text-[clamp(1.75rem,9cqi,2.5rem)] leading-[1.05] text-ink break-words hyphens-auto sm:hyphens-manual">
          {problem.title}
        </h3>

        <p className="mt-5 max-w-prose whitespace-pre-line text-pretty text-[0.9375rem] leading-relaxed text-ink-muted md:text-base">
          {problem.description}
        </p>

        {/* Решение и честная оговорка */}
        <div className="mt-8 max-w-prose border-t border-hairline pt-5">
          <h4 className="text-sm text-ink-muted">Решение</h4>

          <ul className="mt-3 space-y-2 text-[0.9375rem] leading-snug text-ink md:text-base">
            {problem.pros.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-brand-glow" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {problem.cons.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm leading-snug text-ink-muted">
              {problem.cons.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden className="mt-[0.6em] h-px w-2.5 shrink-0 bg-ink-dim" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </div>
  );
}
