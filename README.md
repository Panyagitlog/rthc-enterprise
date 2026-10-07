# RTHC / RTCA Enterprise Platform

DMCFS enterprise workforce management suite — a single React application hosting two
linked apps behind an application selector:

- **RTHC** (Real-Time Head Count) — company, location, and coordinator-driven headcount
  tracking with a live dashboard, KPI cards, and history.
- **RTCA** (Real-Time Client Analytics) — workforce analytics dashboard with requirement /
  filled / vacant reporting, shift and scheme breakdowns, company & location drill-downs,
  trend charts, and CSV/Excel export.

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion,
  React Router, React Hook Form
- **Data:** Supabase (Postgres + Auth + Realtime) for the live application data
- **Backend (in-progress):** Express + Prisma API under [`server/`](server) for a subset
  of endpoints (auth, headcount, dashboard, companies, locations, users)

## Project structure

```
src/            React app (pages, components, hooks, services, routes)
server/         Express + Prisma backend (auth, headcount, company/location APIs)
public/         Static assets, including DMCFS brand logos
```

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Set the Supabase project values in `.env` before using features that require Supabase.

The frontend environment variables are:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key |

Optional Express/Prisma backend:

```bash
cd server
npm install
cp .env.example .env          # configure the database and any API providers
npm run prisma:generate
npm run dev                   # start the Express API
```

The backend example documents `DATABASE_URL`, `JWT_SECRET`, Supabase settings, and
optional AI provider settings. AI chat supports OpenAI and Claude. Set
`OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` in `server/.env`, then choose the provider
from the model selector in the chat header. `OPENAI_MODEL` and `ANTHROPIC_MODEL` can
override the defaults. Keep private keys unprefixed (not `VITE_`) so they stay
server-side.

## Available scripts

| Command           | Description                        |
| ------------------| ----------------------------------- |
| `npm run dev`     | Start the Vite development server   |
| `npm run build`   | Type-check and build for production |
| `npm run lint`    | Run Oxlint                          |
| `npm run preview` | Preview the production build        |

## Branding

Official DMCFS logo assets live in [`public/`](public) (`dmcfs.png`, `dmcfs-mark.png`)
and are served through the [`DMCFSLogo`](src/components/brand/DMCFSLogo.tsx) component,
which supports `full`/`mark` variants and responsive size presets.

## Environment variables

Never commit `.env` files or private credentials. The root and backend `.env.example`
files contain placeholders for configuration; copy the relevant example to `.env` and
fill it in locally. `.gitignore` excludes real environment files from Git.
