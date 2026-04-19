import { PackageCheck, Zap } from "lucide-react";

export default function ShipmentCard() {
  return (
    <div className="relative w-full max-w-md">
      {/* soft floor glow */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand/20 blur-3xl"
      />

      <article className="relative overflow-hidden rounded-[1.75rem] border border-hairline-strong bg-gradient-to-b from-bg-raised to-bg-soft p-6 shadow-lifted backdrop-blur-sm md:p-7">
        <div className="noise-layer rounded-[1.75rem]" />

        {/* Header */}
        <header className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-label text-ink-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-glow opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-glow" />
            </span>
            Live dispatch
          </span>
          <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
            SK-2847-9021
          </span>
        </header>

        <hr className="relative my-5 border-hairline" />

        {/* Route */}
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
              Origin
            </div>
            <div className="mt-1 font-display text-3xl leading-none text-ink">
              London
            </div>
            <div className="mt-1 font-mono text-xs text-ink-muted">
              14:02 · E14
            </div>
          </div>

          <div className="mt-6 flex-1">
            <svg
              viewBox="0 0 200 20"
              className="h-5 w-full"
              aria-hidden
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="routeGrad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#B794FF" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#B794FF" stopOpacity="1" />
                  <stop offset="100%" stopColor="#B794FF" stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <line
                x1="4"
                y1="10"
                x2="196"
                y2="10"
                stroke="url(#routeGrad)"
                strokeWidth="1.5"
                strokeDasharray="3 5"
                className="animate-dash-flow"
              />
              <circle cx="4" cy="10" r="3" fill="#F4EDE1" />
              <circle cx="122" cy="10" r="5" fill="#925AF4" className="animate-float-slow" />
              <circle cx="196" cy="10" r="3" fill="#F4EDE1" fillOpacity="0.5" />
            </svg>
          </div>

          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
              Destination
            </div>
            <div className="mt-1 font-display text-3xl leading-none text-ink">
              Dublin
            </div>
            <div className="mt-1 font-mono text-xs text-ink-muted">
              17:48 · D02
            </div>
          </div>
        </div>

        <hr className="relative my-5 border-hairline" />

        {/* Meta */}
        <div className="relative flex items-center justify-between font-mono text-[11px] uppercase tracking-label">
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <PackageCheck size={14} className="text-brand-glow" />
            1.2 kg · Priority
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-brand-glow">
            <Zap size={12} />
            2h 46m eta
          </span>
        </div>
      </article>
    </div>
  );
}
