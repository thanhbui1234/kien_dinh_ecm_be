# Project Workspace Rules

## Database Migrations
- **CRITICAL**: Never use `prisma db push` to sync schema changes.
- **MANDATORY**: Always generate and run Prisma migrations using `prisma migrate dev` (for development/local sync) or `prisma migrate deploy` (for production/deploy) whenever the `schema.prisma` file is modified.

## Database Seeding Mandate
- **CRITICAL CONSTRAINT**: NEVER run database seed scripts (`pnpm run seed`, `npx prisma db seed`, `ts-node prisma/seed.ts`, etc.) automatically under any circumstances.
- Database seeding MUST only be executed when the user explicitly requests to seed the database.

