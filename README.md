# Skoro — Courier & Delivery

Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase Auth.

## Brand colors

| Role            | Hex     |
| --------------- | ------- |
| Background      | #1D1425 |
| Section accent  | #B38FB9 |
| Primary / Brand | #925AF4 |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
npm run dev
```

Open http://localhost:3000

> The landing page renders without Supabase env vars.
> Login / signup / dashboard require a valid Supabase project.
