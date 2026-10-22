"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { useReveal } from "@/lib/useReveal";

// Адаптация двух компонентов 21st.dev:
// - коробка — геометрия «Bucket» (0xUrvish), перекрашена в палитру сайта, без motion/react;
// - купоны — форма, корешок и 3D-наклон с бликом из «Admit One Ticket» (larsen66),
//   WebGL-дизеринг заменён лёгкой CSS-текстурой из точек.

export type Coupon = {
  title: string; // над суммой
  value: string; // крупно: 0 Kč, −50 %
  note: string; // условие внизу
  stub: string; // вертикальная надпись на корешке
  tone: "violet" | "cream";
};

// ── Геометрия билета (из Admit One Ticket), в долях ширины/высоты купона ────
const TICKET_ASPECT = 741 / 425;
const PERFORATION = 562 / 741; // линия отрыва корешка
const CORNER = { x: 25 / 741, y: 25 / 425 };
const NOTCH = { x: 21 / 741, y: 21 / 425 };

/** Контур купона в objectBoundingBox (0…1): вогнутые углы и полукруглые вырезы на линии отрыва. */
function ticketPath() {
  const { x: rx, y: ry } = CORNER;
  const { x: nx, y: ny } = NOTCH;
  const p = PERFORATION;
  return [
    `M ${rx} 0`,
    `L ${p - nx} 0`,
    `A ${nx} ${ny} 0 0 0 ${p + nx} 0`,
    `L ${1 - rx} 0`,
    `A ${rx} ${ry} 0 0 0 1 ${ry}`,
    `L 1 ${1 - ry}`,
    `A ${rx} ${ry} 0 0 0 ${1 - rx} 1`,
    `L ${p + nx} 1`,
    `A ${nx} ${ny} 0 0 0 ${p - nx} 1`,
    `L ${rx} 1`,
    `A ${rx} ${ry} 0 0 0 0 ${1 - ry}`,
    `L 0 ${ry}`,
    `A ${rx} ${ry} 0 0 0 ${rx} 0`,
    "Z",
  ].join(" ");
}

const TONES = {
  violet: { back: "#925AF4", front: "#B794FF", ink: "#1D1425", dots: "rgba(29,20,37,0.16)" },
  cream: { back: "#F4EDE1", front: "#FFFFFF", ink: "#1D1425", dots: "rgba(146,90,244,0.22)" },
} as const;

// ── Коробка (геометрия из Bucket, viewBox 655×352), сверху добавлено место под купоны ──
const VIEW = "0 -230 655 582"; // 230 единиц над коробкой
const PATHS = {
  flapLeft:
    "M123.116 79.1145L171.548 42.8776L97.2715 12.5164C94.8305 11.5186 93.61 11.0197 92.3446 11.1143C91.0793 11.2089 89.9465 11.8837 87.681 13.2334L56.155 32.0149C48.1832 36.7641 44.1973 39.1386 44.4205 42.4378C44.6438 45.737 48.9132 47.553 57.4522 51.1849L123.116 79.1145Z",
  flapRight:
    "M535.59 78.7427L487.973 42.8776L558.738 13.9516C562.902 12.2494 564.984 11.3984 567.143 11.5597C569.301 11.7211 571.233 12.8723 575.098 15.1747L590.22 24.1832C603.923 32.347 610.775 36.4289 610.372 42.0779C609.97 47.7269 602.609 50.7964 587.887 56.9354L535.59 78.7427Z",
  rim: "M487.973 42.8774L171.548 42.8775L123.116 79.1144L535.59 78.7424L487.973 42.8774Z",
  rimLeft: "M171.548 78.9088V42.8774L123.116 79.1144L171.548 78.9088Z",
  rimRight: "M487.973 78.9088V42.8774L536.404 79.1144L487.973 78.9088Z",
  body:
    "M512.766 79.1595L147.766 79.1624C136.453 79.1625 130.796 79.1626 127.281 82.6773C123.766 86.192 123.766 91.8488 123.766 103.162V327.159C123.766 338.473 123.766 344.13 127.281 347.645C130.796 351.159 136.453 351.159 147.766 351.159H512.766C524.08 351.159 529.737 351.159 533.252 347.645C536.766 344.13 536.766 338.473 536.766 327.159V103.159C536.766 91.8457 536.766 86.1888 533.252 82.6741C529.737 79.1594 524.08 79.1594 512.766 79.1595Z",
  lip:
    "M74.6011 164.033L123.116 79.1138L535.59 78.7419L581.532 164.469C588.006 176.55 591.243 182.59 588.568 187.06C585.892 191.529 579.039 191.529 565.333 191.529H90.5591C76.4759 191.529 69.4343 191.529 66.7781 186.953C64.1219 182.376 67.615 176.262 74.6011 164.033Z",
};

// Положение купонов: внутри коробки (старт) и веером над ней (финиш). Проценты — от контейнера.
const COUPON_POSES = [
  // Финиш подобран так, что нижний угол купона остаётся за передним клапаном (верх клапана ≈ 53%).
  // startX — сдвиг в начале, чтобы купон в коробке не выглядывал из-за её боковой стенки.
  { left: "17%", top: "21%", rotate: "-11deg", shiftX: "-6%", startX: "8%", delay: "0ms" },
  { left: "35%", top: "19%", rotate: "8deg", shiftX: "6%", startX: "0%", delay: "180ms" },
];

export function CouponBox({ coupons, label }: { coupons: [Coupon, Coupon]; label: string }) {
  const ref = useReveal<HTMLDivElement>();
  const clipId = `ticket-${useId().replace(/:/g, "")}`;

  return (
    <div
      ref={ref}
      data-reveal
      role="img"
      aria-label={label}
      className="relative mx-auto w-full max-w-[560px]"
      style={{ aspectRatio: "655 / 582" }}
    >
      {/* Контур купона для clip-path, общий для обоих */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
          <path d={ticketPath()} />
        </clipPath>
      </svg>

      {/* Задняя часть коробки: клапаны и задний край — за купонами */}
      <svg viewBox={VIEW} className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={PATHS.flapLeft} fill="#3A2B4E" />
        <path d={PATHS.flapRight} fill="#3A2B4E" />
        <path d={PATHS.rim} fill="#120B19" />
        <path d={PATHS.rimLeft} fill="#2A1F36" />
        <path d={PATHS.rimRight} fill="#2A1F36" />
      </svg>

      {/* Купоны: стартуют внутри коробки и поднимаются веером, когда секция появилась на экране */}
      {coupons.map((coupon, i) => {
        const pose = COUPON_POSES[i];
        return (
          <div
            key={coupon.title}
            className="absolute w-[46%] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1.25,0.36,1)] [transform:translate(var(--start-x),120%)_rotate(0deg)] motion-reduce:transition-none motion-reduce:[transform:translate(var(--shift-x),0)_rotate(var(--rotate))] [.is-visible_&]:[transform:translate(var(--shift-x),0)_rotate(var(--rotate))]"
            style={
              {
                left: pose.left,
                top: pose.top,
                transitionDelay: pose.delay,
                "--rotate": pose.rotate,
                "--shift-x": pose.shiftX,
                "--start-x": pose.startX,
              } as React.CSSProperties
            }
          >
            <TiltTicket clipId={clipId} coupon={coupon} />
          </div>
        );
      })}

      {/* Передняя часть коробки: стенка с логотипом и передний клапан — перед купонами */}
      <svg viewBox={VIEW} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`${clipId}-body`} x1="0" y1="79" x2="0" y2="351" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2F2340" />
            <stop offset="1" stopColor="#1D1425" />
          </linearGradient>
        </defs>
        <path d={PATHS.body} fill={`url(#${clipId}-body)`} />
        <image
          href="/images/home/skoro_cropped.png"
          x="210"
          y="236"
          width="236"
          height="60"
          opacity="0.9"
          preserveAspectRatio="xMidYMid meet"
        />
        <path d={PATHS.lip} fill="#362748" fillOpacity="0.96" />
        <path d={PATHS.lip} fill="none" stroke="#925AF4" strokeOpacity="0.35" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/** Купон с 3D-наклоном и бликом при наведении (логика TiltCard из Admit One Ticket). */
function TiltTicket({ coupon, clipId }: { coupon: Coupon; clipId: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const onMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el || reduced) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - 0.5;
      const dy = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(1200px) rotateX(${-dy * 18}deg) rotateY(${dx * 18}deg) scale(1.03)`;
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(38% 55% at ${(dx + 0.5) * 100}% ${(dy + 0.5) * 100}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 70%)`;
      }
    },
    [reduced],
  );

  const onLeave = useCallback(() => {
    setHovering(false);
    if (cardRef.current) cardRef.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)";
    if (glareRef.current) glareRef.current.style.background = "transparent";
  }, []);

  const tone = TONES[coupon.tone];

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setHovering(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative will-change-transform"
      style={{
        transition: hovering ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
        filter: "drop-shadow(0 18px 28px rgba(14,8,22,0.45))",
      }}
    >
      <div
        className="relative w-full [container-type:inline-size]"
        style={{
          aspectRatio: `${TICKET_ASPECT}`,
          clipPath: `url(#${clipId})`,
          color: tone.ink,
          backgroundColor: tone.back,
          backgroundImage: `radial-gradient(${tone.dots} 1px, transparent 1.4px), radial-gradient(120% 90% at 70% 15%, ${tone.front}, ${tone.back} 70%)`,
          backgroundSize: "6px 6px, 100% 100%",
        }}
      >
        {/* Основная часть: что, сколько, условие */}
        <div
          className="absolute inset-y-0 left-0 flex flex-col justify-between"
          style={{ width: `${PERFORATION * 100}%`, padding: "7cqw 6cqw 6cqw 7.5cqw" }}
        >
          <div className="text-[5.4cqw] font-medium leading-none">{coupon.title}</div>
          <div className="font-display text-[19cqw] leading-[0.85] tracking-[-0.02em]">{coupon.value}</div>
          <div className="text-[4.6cqw] leading-none opacity-80">{coupon.note}</div>
        </div>

        {/* Линия отрыва */}
        <div
          aria-hidden
          className="absolute inset-y-0"
          style={{
            left: `${PERFORATION * 100}%`,
            width: "2px",
            backgroundImage: `repeating-linear-gradient(to bottom, ${tone.ink}66 0 6px, transparent 6px 12px)`,
          }}
        />

        {/* Корешок с вертикальной надписью */}
        <div
          className="absolute inset-y-0 right-0 grid place-items-center font-display text-[8cqw] uppercase tracking-[0.06em] opacity-85"
          style={{ left: `${PERFORATION * 100}%` }}
        >
          <span style={{ writingMode: "vertical-rl" }}>{coupon.stub}</span>
        </div>
      </div>

      {/* Блик повторяет контур купона */}
      <div
        ref={glareRef}
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `url(#${clipId})`, transition: hovering ? "none" : "background 420ms ease-out" }}
      />
    </div>
  );
}
