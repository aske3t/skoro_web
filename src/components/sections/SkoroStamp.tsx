import { useId } from "react";

const INK = "#925AF4";
const LOGO_SRC = "/images/home/skoro_cropped.png"; // 901×228, прозрачный фон

/**
 * Круглая печать Skoro: двойное кольцо, текст по кругу и логотип в центре.
 * Логотип перекрашивается в цвет чернил по своему силуэту (альфа-каналу PNG),
 * а фильтр «оттиска» даёт неровные края и непропечатанные места, как у резиновой печати.
 */
export function SkoroStamp({
  top,
  bottom,
  className = "",
}: {
  top: string;
  bottom: string;
  className?: string;
}) {
  // Уникальные id: фильтры и пути SVG адресуются по id в пределах документа.
  const uid = useId().replace(/:/g, "");
  const ids = {
    ink: `stamp-ink-${uid}`,
    tint: `stamp-tint-${uid}`,
    top: `stamp-top-${uid}`,
    bottom: `stamp-bottom-${uid}`,
  };

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden focusable="false">
      <defs>
        {/* Текст сверху идёт по дуге слева направо, снизу — тоже слева направо, но под центром */}
        <path id={ids.top} d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id={ids.bottom} d="M 24 100 A 76 76 0 0 0 176 100" />

        {/* Логотип одним цветом: заливка чернилами в пределах альфа-канала картинки */}
        <filter id={ids.tint} colorInterpolationFilters="sRGB">
          <feFlood floodColor={INK} result="ink" />
          <feComposite in="ink" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Оттиск: рваный край + пятна непропечатки */}
        <filter id={ids.ink} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.4" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="11" result="blots" />
          <feColorMatrix
            in="blots"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -6 3.9"
            result="coverage"
          />
          <feComposite in="rough" in2="coverage" operator="in" />
        </filter>
      </defs>

      <g filter={`url(#${ids.ink})`} fill={INK} stroke={INK}>
        <circle cx="100" cy="100" r="95.5" fill="none" strokeWidth="4.5" />
        <circle cx="100" cy="100" r="89" fill="none" strokeWidth="1.6" />
        <circle cx="100" cy="100" r="58" fill="none" strokeWidth="1.6" />

        <text
          stroke="none"
          fontSize="14"
          letterSpacing="0.9"
          style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700 }}
        >
          <textPath href={`#${ids.top}`} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text
          stroke="none"
          fontSize="14"
          letterSpacing="0.9"
          style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700 }}
        >
          <textPath href={`#${ids.bottom}`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
            {bottom}
          </textPath>
        </text>

        {/* Точки-разделители между верхней и нижней надписью */}
        <circle cx="12" cy="100" r="2.2" stroke="none" />
        <circle cx="188" cy="100" r="2.2" stroke="none" />

        <image
          href={LOGO_SRC}
          x="46"
          y="86.3"
          width="108"
          height="27.4"
          preserveAspectRatio="xMidYMid meet"
          filter={`url(#${ids.tint})`}
        />
      </g>
    </svg>
  );
}
