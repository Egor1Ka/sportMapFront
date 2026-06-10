# Frontend Template

A reference frontend template built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + shadcn/ui (base-nova style) + @base-ui/react
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Forms:** react-hook-form + zod
- **Charts:** Recharts
- **Icons:** lucide-react
- **Fonts:** Inter, JetBrains Mono

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                | Description                |
| ---------------------- | -------------------------- |
| `npm run dev`          | Start dev server           |
| `npm run build`        | Production build           |
| `npm run start`        | Serve production build     |
| `npm run lint`         | Run ESLint                 |
| `npm run format`       | Format files with Prettier |
| `npm run format:check` | Check formatting           |

## Pages

| Route         | Description                                |
| ------------- | ------------------------------------------ |
| `/`           | Home — navigation to all pages             |
| `/demo`       | Style overview with interactive components |
| `/login`      | Login page with form and image             |
| `/signup`     | Signup page with form and image            |
| `/shadcndemo` | Full shadcn/ui components showcase         |

## Project Structure

```
app/                  # Next.js App Router (routes, layouts, pages)
components/
  ui/                 # shadcn/ui components (54+)
  example/            # Usage examples for each component
hooks/                # Custom React hooks
lib/                  # Utilities (cn())
types/                # Shared TypeScript types
services/             # API services and data fetching
constants/            # App-wide constants
```

## Docker

```bash
docker compose up --build
```

## CI/CD

GitHub Actions pipeline on push/PR to `main`:

1. **Lint** — ESLint + Prettier check
2. **Build** — production build (depends on Lint passing)
