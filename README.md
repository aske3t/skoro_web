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
cp .env.example .env.local   # fill in values, see below
npm run dev
```

Tests: `npm test` (vitest).

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Publishable (`sb_publishable_…`) or legacy anon key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | public | Google Maps Places (calculator address autocomplete) |
| `SUPABASE_SECRET_KEY` | server | Secret key (`sb_secret_…`) or legacy `service_role`. Bypasses RLS; used only in `src/lib/supabase/admin.ts` to write contact form leads |
| `TELEGRAM_BOT_TOKEN` | server | Bot token from @BotFather for new lead notifications |
| `TELEGRAM_CHAT_ID` | server | Chat or group that receives lead notifications |
| `LEAD_IP_SALT` | server | Random string (≥ 32 chars) for hashing client IPs used in rate limiting |

Server variables must never get the `NEXT_PUBLIC_` prefix. Without them the site
still builds and renders; only the contact form submission fails (without
`TELEGRAM_*` leads are still saved, notifications are skipped with a warning).

## Contact form leads

Leads are stored in `public.leads` (migration in `supabase/migrations/`), written
server-side by the `submitLead` server action. RLS is enabled without policies,
so the table is not reachable with the public key.

Open http://localhost:3000

> The landing page renders without Supabase env vars.
> Login / signup / dashboard require a valid Supabase project.
