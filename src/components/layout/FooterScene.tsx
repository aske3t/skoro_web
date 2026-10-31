"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Ночное Старе Место и фургон Skoro: финал страницы перед юридической лентой.
// Идея — из «Animated Landscape Footer with Truck» (21st.dev), но вместо 3D-дороги плоский силуэт.
// Фургон едет вдоль улицы и бросает посылки в окна; окно, куда попала посылка, загорается.
// Пока сцена вне экрана, анимация стоит. При prefers-reduced-motion фургон припаркован (стили — globals.css).

const W = 1440;
const H = 200;
const LAP_MS = 18000;
const FLIGHT_MS = 950;

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

type Roof = "gable" | "eaves" | "stepped" | "baroque";
type House = { x: number; w: number; h: number; roof: Roof; arcade: boolean };

// Верхний контур дома от левого угла фасада до правого: щипец, скат с люкарной,
// ренессансный ступенчатый или барочный фронтон с волютами.
function roofLine({ x, w, h, roof }: House): string {
  const y = H - h;
  const at = (k: number) => x + w * k;
  switch (roof) {
    case "gable":
      return `L${at(0.5)} ${y - w * 0.55} L${x + w} ${y}`;
    case "eaves":
      return `L${at(0.16)} ${y - 14} H${at(0.4)} V${y - 21} H${at(0.6)} V${y - 14} H${at(0.84)} L${x + w} ${y}`;
    case "stepped":
      return `V${y - 8} H${at(0.14)} V${y - 16} H${at(0.28)} V${y - 24} H${at(0.4)} V${y - 32} H${at(0.6)} V${y - 24} H${at(0.72)} V${y - 16} H${at(0.86)} V${y - 8} H${x + w} V${y}`;
    case "baroque":
      return `C${at(0.1)} ${y} ${at(0.2)} ${y - 6} ${at(0.22)} ${y - 14} C${at(0.24)} ${y - 22} ${at(0.32)} ${y - 22} ${at(0.34)} ${y - 28} V${y - 32} C${at(0.4)} ${y - 46} ${at(0.6)} ${y - 46} ${at(0.66)} ${y - 32} V${y - 28} C${at(0.68)} ${y - 22} ${at(0.76)} ${y - 22} ${at(0.78)} ${y - 14} C${at(0.8)} ${y - 6} ${at(0.9)} ${y} ${x + w} ${y}`;
  }
}

function housePath(h: House): string {
  return `M${h.x} ${H} V${H - h.h} ${roofLine(h)} V${H} Z`;
}

// Сплошной ряд домов без просветов, как на старой площади.
function street(seed: number, minH: number, maxH: number, minW: number, maxW: number): House[] {
  const r = rng(seed);
  const roofs: Roof[] = ["gable", "eaves", "stepped", "baroque"];
  const houses: House[] = [];
  for (let x = -20; x < W + 20; ) {
    const w = Math.round(minW + r() * (maxW - minW));
    houses.push({
      x,
      w,
      h: Math.round(minH + r() * (maxH - minH)),
      roof: roofs[Math.floor(r() * roofs.length)],
      arcade: r() < 0.45,
    });
    x += w;
  }
  return houses;
}

type Pane = { x: number; y: number; lit: "warm" | "violet" | null; drop: boolean };

// Окна по этажам. Часть горит сама; в каждом третьем доме одно тёмное окно верхнего этажа — адрес доставки.
function panes(houses: House[], seed: number): Pane[] {
  const r = rng(seed);
  const out: Pane[] = [];
  houses.forEach((h, i) => {
    const cols = Math.max(2, Math.min(4, Math.floor((h.w - 8) / 13)));
    const step = (h.w - 10) / cols;
    const ground = h.arcade ? 18 : 10;
    const target = i % 3 === 1 ? Math.floor(r() * cols) : -1;
    for (let y = H - h.h + 9, floor = 0; y < H - ground - 7; y += 15, floor++) {
      for (let c = 0; c < cols; c++) {
        const drop = floor === 0 && c === target;
        const lit = drop ? null : r() < 0.18 ? (r() < 0.6 ? "warm" : "violet") : null;
        out.push({ x: Math.round(h.x + 5 + step * c + step / 2 - 2.5), y, lit, drop });
      }
    }
  });
  return out;
}

const BACK = street(11, 40, 70, 34, 60);
const FRONT = street(29, 52, 96, 40, 66);
const PANES = panes(FRONT, 53);

// Башни над крышами (по центру кадра — на телефоне видна только середина):
// готические шпили с башенками, ратушная башня с галереей, барочный купол, шпиль-игла, луковица.
function gothicTower(x: number, w: number, top: number, spire: number): string {
  return (
    `M${x} ${H} V${top} L${x + w / 2} ${spire} L${x + w} ${top} V${H} Z ` +
    `M${x - 3} ${top + 4} L${x + 1} ${top - 18} L${x + 5} ${top + 4} Z ` +
    `M${x + w - 5} ${top + 4} L${x + w - 1} ${top - 18} L${x + w + 3} ${top + 4} Z`
  );
}

const LANDMARKS = [
  // двухбашенный собор на холме
  "M180 200 Q260 160 340 200 Z",
  gothicTower(236, 12, 104, 54),
  gothicTower(268, 12, 104, 54),
  "M230 200 V132 H292 V200 Z",
  // двухбашенный храм с шпилями-башенками
  "M560 200 V128 L605 104 L650 128 V200 Z",
  gothicTower(572, 16, 84, 26),
  gothicTower(616, 16, 84, 26),
  // ратушная башня: галерея, шатёр и угловые башенки
  "M754 200 V78 H750 V72 H780 V78 H776 V200 Z",
  "M750 72 L765 34 L780 72 Z M747 74 L750 58 L753 74 Z M777 74 L780 58 L783 74 Z",
  // барочный купол с фонарём
  "M880 200 V142 H960 V200 Z M902 142 V112 H938 V142 Z",
  "M900 113 C900 82 940 82 940 113 Z M916 92 V78 H924 V92 Z M918 78 L920 66 L922 78 Z",
  // шпиль-игла
  gothicTower(1072, 14, 96, 14),
  // барочная колокольня с луковицей
  "M1240 200 V104 H1258 V200 Z M1236 104 C1232 94 1240 84 1249 78 C1258 84 1266 94 1262 104 Z M1248 78 V62 H1250 V78 Z",
].join(" ");

export function FooterScene() {
  const ref = useRef<HTMLDivElement>(null);
  const vanRef = useRef<HTMLDivElement>(null);
  const parcelsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = ref.current;
    const van = vanRef.current;
    const pool = parcelsRef.current;
    if (!scene || !van || !pool) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let lap = -1;
    let width = 0;
    let vanW = 0;
    let cargo = -Infinity;
    let nextParcel = 0;
    let targets: { el: Element; x: number; done: boolean }[] = [];

    // Окна-адреса по горизонтали в пикселях сцены: SVG обрезается по ширине (slice), считать вручную ненадёжно.
    // Окна, мимо которых фургон уже проехал, в этом круге не трогаем.
    const measure = () => {
      const box = scene.getBoundingClientRect();
      width = box.width;
      vanW = van.getBoundingClientRect().width;
      targets = Array.from(scene.querySelectorAll("[data-drop]"))
        .map(el => {
          const r = el.getBoundingClientRect();
          const x = r.left - box.left + r.width / 2;
          return { el, x, done: cargo >= x - 36 };
        })
        // Бросаем, только когда фургон уже въехал в кадр.
        .filter(t => t.x > vanW * 0.6 && t.x < width - 8)
        .sort((a, b) => a.x - b.x);
    };

    // Высоту окна и фургона берём в момент броска: при появлении слои ещё поднимаются.
    const throwParcel = (fromX: number, target: Element) => {
      const parcel = pool.children[nextParcel++ % pool.children.length] as HTMLElement;
      const box = scene.getBoundingClientRect();
      const win = target.getBoundingClientRect();
      const to = { x: win.left - box.left + win.width / 2, y: win.top - box.top + win.height / 2 };
      const fromY = van.getBoundingClientRect().top - box.top + 4;
      const peak = Math.min(fromY, to.y) - 46;
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = fromX + (to.x - fromX) * t;
        const y = (1 - t) ** 2 * fromY + 2 * t * (1 - t) * peak + t ** 2 * to.y;
        const s = t < 0.8 ? 1 : 1 - (t - 0.8) * 2.5;
        frames.push({
          transform: `translate(${x - 5}px, ${y - 4}px) rotate(${t * 200}deg) scale(${s})`,
          opacity: t === 1 ? 0 : 1,
        });
      }
      parcel.animate(frames, { duration: FLIGHT_MS, easing: "linear" }).onfinish = () => {
        target.classList.add("is-lit");
      };
    };

    const frame = (now: number) => {
      elapsed += Math.min(now - (last || now), 50);
      last = now;
      const thisLap = Math.floor(elapsed / LAP_MS);
      if (thisLap !== lap) {
        lap = thisLap;
        targets.forEach(t => {
          t.done = false;
          t.el.classList.remove("is-lit");
        });
      }
      const x = -vanW + ((elapsed % LAP_MS) / LAP_MS) * (width + vanW * 2);
      van.style.transform = `translateX(${x}px)`;
      // Посылка уходит с крыши кузова чуть раньше, чем фургон поравняется с окном.
      cargo = x + vanW * 0.28;
      for (const t of targets) {
        if (!t.done && cargo >= t.x - 36) {
          t.done = true;
          throwParcel(cargo, t.el);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) scene.classList.add("is-visible");
        scene.classList.toggle("is-running", entry.isIntersecting);
        if (reduced) return;
        cancelAnimationFrame(raf);
        if (entry.isIntersecting) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      },
      { threshold: 0.2 },
    );
    const ro = new ResizeObserver(measure);
    measure();
    io.observe(scene);
    ro.observe(scene);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="city-scene relative h-[180px] overflow-hidden md:h-[260px]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 90% at 50% 100%, rgba(146,90,244,0.16), transparent 70%)",
        }}
      />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-8 h-[calc(100%-2rem)] w-full"
      >
        <g className="city-layer" style={{ "--i": 0 } as CSSProperties} fill="#1B1326">
          <path d={LANDMARKS} />
          {BACK.map(h => (
            <path key={h.x} d={housePath(h)} />
          ))}
        </g>
        <g className="city-layer" style={{ "--i": 1 } as CSSProperties}>
          <g fill="#2A1F36">
            {FRONT.map(h => (
              <path key={h.x} d={housePath(h)} />
            ))}
          </g>
          {/* Аркады первого этажа (podloubí) */}
          <g fill="#160F1F">
            {FRONT.filter(h => h.arcade).map(h => {
              const n = Math.max(2, Math.round(h.w / 22));
              const step = h.w / n;
              return Array.from({ length: n }, (_, i) => {
                const ax = h.x + step * i + 3;
                const aw = step - 6;
                return (
                  <path
                    key={`${h.x}-${i}`}
                    d={`M${ax} ${H} V${H - 9} A${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${H - 9} V${H} Z`}
                  />
                );
              });
            })}
          </g>
          {PANES.map((p, i) => (
            <rect
              key={i}
              x={p.x}
              y={p.y}
              width={5}
              height={7}
              data-drop={p.drop || undefined}
              className={p.drop ? "drop-window" : undefined}
              fill={p.lit === "warm" ? "#F4EDE1" : p.lit === "violet" ? "#B794FF" : "#1D1425"}
              opacity={p.lit === "warm" ? 0.32 : p.lit === "violet" ? 0.55 : 1}
            />
          ))}
        </g>
      </svg>

      {/* Дорога: бордюр и пунктир разметки */}
      <div
        className="city-layer absolute inset-x-0 bottom-0 h-8 border-t border-hairline-strong bg-bg-deep"
        style={{ "--i": 2 } as CSSProperties}
      >
        <div
          className="absolute inset-x-0 top-1/2 h-px"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(244,237,225,0.22) 0 18px, transparent 18px 40px)" }}
        />
      </div>

      <div ref={vanRef} className="van absolute bottom-3.5 left-0 w-[150px] md:w-[200px]">
        <Van />
      </div>

      {/* Посылки: несколько штук по кругу, координаты задаёт анимация */}
      <div ref={parcelsRef}>
        {[0, 1, 2].map(i => (
          <span key={i} className="parcel absolute left-0 top-0 h-[9px] w-[10px] rounded-[1.5px] opacity-0" />
        ))}
      </div>
    </div>
  );
}

// Фургон смотрит вправо: кузов с тёмной наклейкой и логотипом, кабина, фиолетовая полоса, фары.
function Van() {
  return (
    <svg viewBox="0 0 200 64" className="block w-full">
      <defs>
        <linearGradient id="van-beam" x1="0" x2="1">
          <stop offset="0" stopColor="#FFF1C8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFF1C8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M139 38 L200 27 L200 55 Z" fill="url(#van-beam)" />
      <g className="van-body">
        <rect x="4" y="6" width="96" height="41" rx="4" fill="#F4EDE1" />
        <path d="M100 14 H122 Q126 14 128 18 L135 31 Q139 33 139 38 V47 H100 Z" fill="#F4EDE1" />
        <path d="M106 18 H121 Q123 18 124 20 L130 31 H106 Z" fill="#362748" />
        <rect x="8" y="10" width="88" height="25" rx="3" fill="#1D1425" />
        <image href="/images/home/skoro_cropped.png" x="12" y="12.5" width="80" height="20" preserveAspectRatio="xMidYMid meet" />
        <rect x="4" y="38" width="135" height="4" fill="#925AF4" />
        <rect x="136" y="40" width="3" height="3" rx="1" fill="#FFF1C8" />
        <rect x="3" y="40" width="2" height="4" fill="#FF8A80" />
      </g>
      <Wheel cx={28} />
      <Wheel cx={117} />
    </svg>
  );
}

function Wheel({ cx }: { cx: number }) {
  return (
    <g className="van-wheel">
      <circle cx={cx} cy={52} r={10} fill="#0E0816" />
      <circle cx={cx} cy={52} r={4.5} fill="#8A7A96" />
      <path d={`M${cx - 4.5} 52 H${cx + 4.5} M${cx} 47.5 V56.5`} stroke="#0E0816" strokeWidth="1.5" />
    </g>
  );
}
