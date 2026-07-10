# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) or any AI assistant when working with code in this repository.

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
npx prisma db push             # apply schema directly (for rapid prototyping)
npx prisma migrate dev         # apply migrations in development
npx prisma migrate deploy      # apply migrations in production
npx prisma generate            # regenerate Prisma client after schema changes
npx prisma studio              # open Prisma Studio GUI
pnpm run seed                  # seed initial database data (e.g. admin user)
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Key | Purpose |
|-----|---------|
| `PORT` | HTTP port (defaults to 3000 if unset) |
| `DATABASE_URL` | PostgreSQL connection string (Neon serverless) |
| `JWT_SECRET` | Secret key for signing Access Tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Secret key for signing Refresh Tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | Image upload via Cloudinary |

## Architecture & Code Flow

This is a NestJS 11 backend for an industrial ECM (equipment/content management) site.

**Folder Structure**:
- `src/common/`: Shared resources like global `filters` (HttpException, PrismaException), `guards` (JwtAuthGuard), `interceptors` (TransformInterceptor), `decorators` (@Public, @CurrentUser), and `constants`.
- `src/core/config/`: App configuration (including strict env validation via `class-validator`).
- `src/database/`: Global `PrismaModule`.
- `src/modules/`: Feature modules (e.g., `auth`, `users`).

**API Flow**:
1. Global Guards (`JwtAuthGuard`) secure routes by default. Use `@Public()` for open routes.
2. Controllers delegate to Services.
3. Errors should be thrown as `HttpException` (from `@nestjs/common`). DO NOT wrap everything in `try-catch`. The global filters will catch and format them into standard responses.
4. `TransformInterceptor` automatically maps responses into `{ success: true, statusCode: 200, data: {...}, timestamp }`.

## Authentication (Dual Token Pattern)

- `POST /auth/login` returns `accessToken` and `refreshToken`. The refresh token is hashed via bcrypt and saved to the `User` table.
- `POST /auth/refresh` requires `refreshToken` and issues a new token pair if the hash matches.
- `POST /auth/logout` sets `refreshToken` to `null` in DB, effectively revoking the session.

## Database (Prisma + Neon)

**Database:** PostgreSQL hosted on Neon (serverless), accessed via Prisma 7. The `PrismaService` wrapper is exposed globally via `@Global()` in `PrismaModule`.

**Schema domains** (`prisma/schema.prisma`):

| Domain | Models | Notes |
|--------|--------|-------|
| Admin auth | `User` | Roles: `SUPER_ADMIN`, `EDITOR`. Includes `refreshToken`. |
| Catalog | `Category` | Recursive self-relation for multi-level categories. |
| Products | `Product`, `ProductDetail`, `ProductImage` | Vertical partition: `Product` holds list-scan fields; heavy HTML + JSONB specs live in `ProductDetail` (1-1). |
| Projects | `Project`, `ProjectDetail`, `ProjectProduct`, `ProjectCategory` | Showcases linking products + categories via explicit join tables. |
| Leads | `ContactRequest` | Status: `PENDING`, `CONTACTED`, `SPAM`. |
| Recruitment | `JobPost`, `JobPostDetail` | Same 1-1 split pattern as Product. |
| Config | `SystemSetting`, `CompanySlogan`, `CompanyTimeline` | Key-value site settings and About Us content. |

**Key architectural patterns:**
- **1-1 vertical partitioning** is used consistently: lightweight list models (`Product`, `Project`) are separated from their detail counterparts to keep list-scan queries fast.
- **Slug fields** are present on all content models and must be unique — use them as public URL identifiers.
- **Many-to-many via explicit join tables** (`ProjectProduct`, `ProjectCategory`) rather than Prisma implicit M2M, allowing future extension of the join rows.

**CRITICAL WORKFLOW**:
Always read and strictly follow the [workflow rules](.claude/rules/workflow.md) before proposing plans or making any code changes.