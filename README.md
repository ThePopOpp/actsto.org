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

   At minimum for local development you typically need:

   - `DATABASE_URL` — Prisma connection (see [Database](#database))
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_URL` — e.g. `http://localhost:3000`
   - `NEXT_PUBLIC_SITE_URL` — usually matches `AUTH_URL` locally
   - `ADMIN_EMAILS` — comma-separated emails allowed for super-admin (demo flow)

   See `.env.example` for optional variables (preview routes, temp admin login, etc.).

3. **Database** — Prisma uses **SQLite** by default for local dev (`DATABASE_URL="file:./prisma/dev.db"`). Apply the schema:

   ```bash
   npx prisma db push
   ```

   When you start using named migrations, use `npx prisma migrate dev` instead.

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

- **Local:** SQLite via `DATABASE_URL=file:./prisma/dev.db` (see `.env.example`).
- **Production:** Plan to use **PostgreSQL** (e.g. Supabase) — `.env.example` includes commented `DIRECT_URL` for pooled hosts. Switching providers requires updating `prisma/schema.prisma` and `lib/prisma.ts` when you are ready.

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
