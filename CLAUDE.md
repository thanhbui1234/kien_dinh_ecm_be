# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # install dependencies
pnpm run start:dev    # run in watch mode (development)
pnpm run build        # compile to dist/
pnpm run start:prod   # run compiled output

pnpm run test                  # unit tests (jest, rootDir: src, *.spec.ts)
pnpm run test:watch            # unit tests in watch mode
pnpm run test:e2e              # e2e tests (test/jest-e2e.json)
pnpm run test:cov              # coverage report

pnpm run lint                  # eslint --fix
pnpm run format                # prettier --write

# Database (Prisma)
pnpm prisma migrate dev        # apply migrations in development
pnpm prisma migrate deploy     # apply migrations in production
pnpm prisma generate           # regenerate Prisma client after schema changes
pnpm prisma studio             # open Prisma Studio GUI
```

## Environment

Copy `.env.example` to `.env` and fill in the values:

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon serverless) |
| `JWT_EXPIRES_IN` | JWT token lifetime (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET` | Image upload via Cloudinary |
| `PORT` | HTTP port (defaults to 3000 if unset) |

## Architecture

This is a NestJS 11 backend for an industrial ECM (equipment/content management) site.

**Database:** PostgreSQL hosted on Neon (serverless), accessed via Prisma 7 with the `@prisma/adapter-pg` connection-pool adapter. The `PrismaService` (`src/prisma/`) wraps `PrismaClient`, wires the `pg` pool, and handles connect/disconnect lifecycle hooks. `PrismaModule` is global and imported once in `AppModule`.

**Schema domains** (`prisma/schema.prisma`):

| Domain | Models | Notes |
|--------|--------|-------|
| Admin auth | `User` | Roles: `SUPER_ADMIN`, `EDITOR` |
| Catalog | `Category` | Recursive self-relation for multi-level categories |
| Products | `Product`, `ProductDetail`, `ProductImage` | Vertical partition: `Product` holds list-scan fields; heavy HTML + JSONB specs live in `ProductDetail` (1-1). `price: null` → "contact for quote" |
| Projects | `Project`, `ProjectDetail`, `ProjectProduct`, `ProjectCategory` | Showcases linking products + categories via explicit join tables |
| Leads | `ContactRequest` | Status: `PENDING`, `CONTACTED`, `SPAM` |
| Recruitment | `JobPost`, `JobPostDetail` | Same 1-1 split pattern as Product |
| Config | `SystemSetting`, `CompanySlogan`, `CompanyTimeline` | Key-value site settings and About Us content |

**Key architectural patterns:**
- **1-1 vertical partitioning** is used consistently: lightweight list models (`Product`, `Project`, `JobPost`) are separated from their detail counterparts (`ProductDetail`, `ProjectDetail`, `JobPostDetail`) to keep list-scan queries fast.
- **Slug fields** are present on all content models and must be unique — use them as public URL identifiers.
- **Many-to-many via explicit join tables** (`ProjectProduct`, `ProjectCategory`) rather than Prisma implicit M2M, allowing future extension of the join rows.

**Prisma config file:** `prisma.config.ts` (at root) uses `defineConfig` and reads `DATABASE_URL` at migration time. The schema path is `prisma/schema.prisma`.
