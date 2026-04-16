# Arizona Christian Tuition (ACT-NextJS)

Next.js application for **Arizona Christian Tuition** — campaigns, donations (PayPal), dashboards by role, admin tools, and public marketing pages. Built with the App Router, React 19, Tailwind CSS, Prisma, and NextAuth (Auth.js v5).

## Requirements

- **Node.js** 20+ (LTS recommended)
- **npm** (or compatible package manager)

## Setup

1. **Clone** the repository and install dependencies:

   ```bash
   npm install
   ```

2. **Environment variables** — copy the example file and fill in values:

   ```bash
   cp .env.example .env
   ```

   `npm run build` and the app need `DATABASE_URL` (and related vars) at runtime — the Prisma client will not start without it.

   At minimum for local development you typically need:

   - `DATABASE_URL` and `DIRECT_URL` — Supabase / Postgres (see [Database](#database))
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_URL` — e.g. `http://localhost:3000`
   - `NEXT_PUBLIC_SITE_URL` — usually matches `AUTH_URL` locally
   - `ADMIN_EMAILS` — comma-separated emails allowed for super-admin (demo flow)

   See `.env.example` for optional variables (preview routes, temp admin login, etc.).

3. **Database** — The app uses **PostgreSQL** via **Supabase** (or any Postgres URL). Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — pooled connection (recommended for Next.js / Supabase **Transaction** pooler).
   - `DIRECT_URL` — direct Postgres URI for **`prisma migrate`** (see Supabase docs for Prisma).

   Apply migrations to your database:

   ```bash
   npx prisma migrate deploy
   ```

   During active schema development (local only):

   ```bash
   npx prisma migrate dev
   ```

4. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start development server |
| `npm run build` | Production build        |
| `npm run start` | Start production server  |
| `npm run lint` | Run ESLint               |

## Database

- **PostgreSQL** via Prisma with the **`pg`** driver adapter (`lib/prisma.ts`). Connection strings live in `.env` — see `.env.example` for `DATABASE_URL` (runtime, typically Supabase pooler) and `DIRECT_URL` (migrations / direct session).
- **Supabase:** Follow [Supabase + Prisma](https://supabase.com/docs/guides/database/prisma) when creating pooling vs direct URIs.

Schema and migrations live under `prisma/`. Generated Prisma Client output is ignored in git (`/lib/generated/prisma`).

## Project layout (high level)

- `app/` — routes (marketing, auth, dashboards, legal, API)
- `components/` — UI and feature components
- `lib/` — utilities, auth, Prisma client, constants
- `prisma/` — `schema.prisma` and migrations
- `docs/legal/source/` — source Word documents for legal copy (optional reference)

## Legal pages

Public policies are served under `/legal/*` (privacy, terms, communication policy, tax disclosure). Footer links point to these routes.

## Contributing & deployment

- Do **not** commit `.env` or real secrets; keep `.env.example` updated with **variable names** only.
- Configure the same variables in your host (e.g. Vercel) for production builds.
- Run `npm run build` before merging or releasing to catch type and compile errors.

## License

Private / all rights reserved unless otherwise noted by the repository owner.
