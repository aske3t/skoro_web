import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#1D1425",
          deep: "#0E0816",
          soft: "#2A1F36",
          raised: "#362748",
        },
        section: {
          DEFAULT: "#B38FB9",
          warm: "#C8A5CE",
          shadow: "#9B75A4",
        },
        brand: {
          DEFAULT: "#925AF4",
          hover: "#7E46E0",
          soft: "#A67AFF",
          glow: "#B794FF",
        },
        ink: {
          DEFAULT: "#F4EDE1",
          muted: "#C9B8D4",
          dim: "#8A7A96",
        },
        hairline: {
          DEFAULT: "rgba(244, 237, 225, 0.08)",
          strong: "rgba(244, 237, 225, 0.20)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        label: "0.22em",
      },
      boxShadow: {
        brand: "0 30px 60px -20px rgba(146, 90, 244, 0.5), 0 0 0 1px rgba(146, 90, 244, 0.18)",
        card: "0 22px 50px -20px rgba(14, 8, 22, 0.6), 0 0 0 1px rgba(244, 237, 225, 0.06)",
        lifted: "0 40px 80px -24px rgba(14, 8, 22, 0.7)",
      },
      animation: {
        marquee: "marquee 42s linear infinite",
        "blink-caret": "blink 1.1s steps(2) infinite",
        "fade-up": "fadeUp 720ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "dash-flow": "dashFlow 2.4s linear infinite",
        "spin-slow": "spin 18s linear infinite",
        "float-slow": "float 7s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        blink: { "50%": { opacity: "0" } },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        dashFlow: {
          to: { strokeDashoffset: "-24" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
