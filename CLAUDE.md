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
| `PORT` | HTTP port (defaults to 8080). On Render, leave unset — platform injects it automatically. |
| `DATABASE_URL` | PostgreSQL connection string (Neon serverless) |
| `JWT_SECRET` | Secret key for signing Access Tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | Secret key for signing Refresh Tokens |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | Image upload via Cloudinary |

## Architecture & Code Patterns

NestJS 11 backend. Global providers are wired in `AppModule`.

**Folder Structure**:
- `src/common/`: Global `filters`, `guards`, `interceptors`, `decorators`, `constants`, `middlewares`.
- `src/core/config/`: Strict env validation via `class-validator`.
- `src/database/`: `@Global()` `PrismaModule`.
- `src/modules/`: Feature modules (`auth`, `users`, `upload`, `health`).

**Request pipeline (in order)**:
1. `LoggerMiddleware` → logs every request to console.
2. `JwtAuthGuard` → blocks unauthorized requests. Use `@Public()` to bypass.
3. `RolesGuard` → checks `@Roles()` decorator against JWT payload.
4. Controller → delegates to Service.
5. `TransformInterceptor` → wraps success response: `{ success: true, statusCode, data, timestamp }`.
6. `HttpExceptionFilter` / `PrismaClientExceptionFilter` → catches errors and returns: `{ success: false, statusCode, errorCode, message, timestamp, path }`.

**Rules**:
- NEVER use `try-catch` in Controllers/Services just to format error JSON. Always `throw new HttpException(...)` and let the filters handle it.
- All error messages and codes must live in `src/common/constants/` — never hardcode strings in logic.
- Middleware route pattern must be `'{*path}'` (NestJS 11 / path-to-regexp v8). Do NOT use bare `'*'`.

## API Documentation (Swagger)

- Swagger UI served at `/api/docs`.
- `@nestjs/swagger` CLI plugin is enabled — TypeScript types are auto-extracted. No need to manually add `@ApiProperty()` to DTO fields.
- Controllers must have `@ApiTags`, `@ApiOperation`, and `@ApiBearerAuth` (for protected routes).

## Authentication (Dual Token Pattern)

- `POST /auth/login` → returns `{ accessToken, refreshToken }`. Refresh token is bcrypt-hashed and stored in DB.
- `POST /auth/refresh` → accepts `refreshToken`, validates hash, returns new token pair.
- `POST /auth/logout` → sets `refreshToken = null` in DB (token revocation).

## File Uploads

- Route: `POST /api/v1/upload`.
- Files are streamed directly to Cloudinary via `upload_stream` — no disk I/O.
- Optional `bgOption=transparent` triggers local AI background removal via `@imgly/background-removal-node`.
- Constants (folder name, mime types, `BgOption` enum) live in `src/modules/upload/constants/upload.constant.ts`.

## Database (Prisma + Neon)

PostgreSQL on Neon Serverless, accessed via Prisma 7. `PrismaService` is globally available.

**Key architectural patterns:**
- **1-1 vertical partitioning**: Lightweight list models (`Product`, `Project`) are split from heavy detail counterparts (`ProductDetail`, `ProjectDetail`) to keep list-scan queries fast.
- **Slug fields** on all content models — unique, used as public URL identifiers.
- **Explicit M2M join tables** (`ProjectProduct`, `ProjectCategory`) instead of Prisma implicit M2M, to allow future join-row extensions.

See `README.md` for the full database schema domain table.

## Monitoring & Health

- `GET /api/v1/health` — lightweight public endpoint returning `{ status: 'ok', timestamp }`.
- Used by UptimeRobot (interval: **14 minutes**) to prevent Render Free Tier cold starts.
- Must stay database-free and extremely fast.

See `README.md` for full UptimeRobot and Render deployment setup.

**CRITICAL WORKFLOW**:
Always read and strictly follow the [workflow rules](.claude/rules/workflow.md) before proposing plans or making any code changes.