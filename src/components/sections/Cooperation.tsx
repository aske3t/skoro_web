"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/lib/useReveal";
import {
  FileCheck2,
  FileText,
  Handshake,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";

type Step = {
  ordinal: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: Step[] = [
  {
    ordinal: "01",
    title: "Заявка",
    description:
      "Оставляете заявку на сотрудничество\u00a0— через форму на сайте или звонком.",
    icon: FileText,
  },
  {
    ordinal: "02",
    title: "Потребности и договор",
    description:
      "Узнаём ваши задачи, фиксируем объёмы и цену, заключаем договор без бумажной волокиты.",
    icon: Handshake,
  },
  {
    ordinal: "03",
    title: "Настройка процесса",
    description:
      "Индивидуально настраиваем рабочий процесс — каналы связи, регламенты, форматы заявок.",
    icon: SlidersHorizontal,
  },
  {
    ordinal: "04",
    title: "Доставка",
    description:
      "Выполняем заказы — слоты, экспресс или регулярные рейсы. Возьмём клиентскую доставку и вашу внутреннюю логистику на себя.",
    icon: Truck,
  },
  {
    ordinal: "05",
    title: "Отчётные документы",
    description:
      "Добавляем вас в нашу CRM, делаем для вас отчётность по заказам в оговоренном формате.",
    icon: FileCheck2,
  },
  {
    ordinal: "06",
    title: "Растём вместе с вами",
    description: "Открыли новую точку или появились новые задачи? Расширим сервис под ваши условия.",
    icon: TrendingUp,
  },
];

// Соты: в центре — крупная ячейка с подписью, вокруг шесть шагов по часовой, начиная сверху.
// Ячейки — шестиугольники с плоским верхом, вместе они складываются в шестиугольник.
// Координаты — в единицах схемы, центр в (0, 0).
const CELL_W = 300; // ширина ячейки шага, от угла до угла
const CELL_H = (CELL_W * Math.sqrt(3)) / 2;
const CENTER_SCALE = 1.35; // главная ячейка крупнее
const GAP = 26; // зазор между центральной ячейкой и шагами
// Шаги стоят вплотную к центральной ячейке: половина её высоты + половина своей + зазор.
const CELL_STEP = (CELL_H * CENTER_SCALE + CELL_H) / 2 + GAP;
const BOX = {
  w: 2 * (CELL_STEP * Math.sin(Math.PI / 3) + CELL_W / 2) + 20,
  h: 2 * (CELL_STEP + CELL_H / 2) + 20,
};

// Центр ячейки шага i: соседи в сотах лежат через 60°, первый — сверху.
function cellCenter(i: number) {
  const rad = (i * 60 * Math.PI) / 180;
  return { x: CELL_STEP * Math.sin(rad), y: -CELL_STEP * Math.cos(rad) };
}

// Шестиугольник с плоским верхом в собственной рамке ячейки (0…W × 0…H).
const HEX_POINTS = [
  [0, CELL_H / 2],
  [CELL_W / 4, 0],
  [(CELL_W * 3) / 4, 0],
  [CELL_W, CELL_H / 2],
  [(CELL_W * 3) / 4, CELL_H],
  [CELL_W / 4, CELL_H],
]
  .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
  .join(" ");

// Положение ячейки поверх схемы: проценты от её рамки.
const pctX = (x: number) => `${((x + BOX.w / 2) / BOX.w) * 100}%`;
const pctY = (y: number) => `${((y + BOX.h / 2) / BOX.h) * 100}%`;
const cellWidth = (scale: number) => `${((CELL_W * scale) / BOX.w) * 100}%`;

export default function Cooperation() {
  return (
    <section
      id="cooperation"
      className="relative overflow-hidden bg-bg pb-36 pt-32"
    >
      {/* Background layers */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(146,90,244,0.16), transparent 60%), radial-gradient(ellipse 50% 60% at 50% 100%, rgba(179,143,185,0.10), transparent 65%)",
        }}
      />
      <div className="noise-layer" />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Header */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <h2 className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.75rem)] leading-[1] tracking-[-0.02em] text-ink">
              Как выглядит{" "}
              <span className="italic text-brand-glow">сотрудничество</span>
              <br className="hidden md:block" /> с нами.
            </h2>
          </div>
          <p className="max-w-md self-end ml-auto text-base leading-relaxed text-ink-muted md:text-lg">
            Шесть шагов — от заявки на сотрудничество до закрывающих документов. Подключение
            возможно уже в день обращения.
          </p>
        </div>

        {/* Desktop: соты */}
        <HexDiagram />

        {/* Mobile: stacked list */}
        <MobileList />
      </div>
    </section>
  );
}

function HexDiagram() {
  return (
    <div
      role="list"
      aria-label="Шаги сотрудничества"
      className="relative mx-auto mt-16 hidden w-full max-w-[860px] lg:block"
      style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}
    >
      <HexCell x={0} y={0} scale={CENTER_SCALE} main>
        <h3 className="font-display text-4xl leading-[1.05] tracking-[-0.01em] text-ink xl:text-5xl">
          От <span className="italic text-brand-glow">заявки</span>
          <br />
          до <span className="italic text-brand-glow">отчёта</span>
        </h3>
      </HexCell>

      {steps.map((step, i) => {
        const c = cellCenter(i);
        return (
          <HexCell key={step.ordinal} x={c.x} y={c.y} scale={1} delay={i * 120} role="listitem">
            <StepContent step={step} />
          </HexCell>
        );
      })}
    </div>
  );
}

// Ячейка сот. Наведение ловит только сам шестиугольник (pointer-events у polygon),
// поэтому подсветка не срабатывает в углах прямоугольника вокруг него.
function HexCell({
  x,
  y,
  scale,
  main = false,
  delay = 0,
  role,
  children,
}: {
  x: number;
  y: number;
  scale: number;
  main?: boolean;
  delay?: number;
  role?: string;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      role={role}
      style={{
        left: pctX(x),
        top: pctY(y),
        width: cellWidth(scale),
        aspectRatio: `${CELL_W} / ${CELL_H}`,
        transitionDelay: `${delay}ms`,
        transform: "translate(-50%, -50%)",
      }}
      className="group pointer-events-none reveal absolute"
    >
      {/* Наведение: ячейка чуть приподнимается, контур и фон плавно меняют цвет (как карточки «Почему мы») */}
      <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <svg
          aria-hidden
          viewBox={`0 0 ${CELL_W} ${CELL_H}`}
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <polygon
            points={HEX_POINTS}
            vectorEffect="non-scaling-stroke"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className={`pointer-events-auto fill-bg transition-[fill,stroke] duration-300 group-hover:fill-bg-soft group-hover:stroke-brand motion-reduce:transition-none ${
              main ? "stroke-brand-glow/60" : "stroke-brand-glow/30"
            }`}
          />
        </svg>
        {/* Текст — в середине ячейки: шестиугольник шире всего посередине */}
        <div className="absolute inset-x-[13%] inset-y-[8%] flex flex-col items-center justify-center text-center">
          {children}
        </div>
      </div>
    </div>
  );
}

function StepContent({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <>
      <div className="flex items-center gap-2 text-brand-glow/85 transition-colors duration-300 group-hover:text-brand-glow">
        <Icon aria-hidden strokeWidth={1.5} className="h-5 w-5 xl:h-6 xl:w-6" />
        <span className="font-display text-2xl italic leading-none xl:text-3xl">{step.ordinal}</span>
      </div>
      <h4 className="mt-2.5 text-balance font-display text-lg leading-tight text-ink xl:text-xl">
        {step.title}
      </h4>
      {step.description && (
        <p className="mt-1.5 text-pretty text-[12.5px] leading-snug text-ink-muted xl:text-[13px]">
          {step.description}
        </p>
      )}
    </>
  );
}

// До lg: шаги по вертикали, номера соединены пунктиром.
function MobileList() {
  return (
    <ol aria-label="Шаги сотрудничества" className="mt-14 max-w-2xl lg:hidden">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.ordinal} className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 pb-10 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute bottom-2 left-[1.375rem] top-12 border-l border-dashed border-brand-glow/45"
              />
            )}
            <span className="justify-self-center font-display text-3xl italic leading-none text-brand-glow/80">
              {step.ordinal}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <Icon aria-hidden strokeWidth={1.5} className="h-5 w-5 shrink-0 text-brand-glow" />
                <h4 className="font-display text-xl leading-tight text-ink">{step.title}</h4>
              </div>
              {step.description && (
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{step.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
