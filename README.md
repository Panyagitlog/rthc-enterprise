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
cp .env.example .env          # fill in Supabase URL/anon key
npm run dev                   # start the Vite dev server
```

Optional Express/Prisma backend:

```bash
cd server
npm install
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm run dev
```

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

Never commit real `.env` files. See `.gitignore` for the ignored patterns and use
`.env.example` files to document required variables without secrets.
