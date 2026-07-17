# Project Workspace Rules

## Database Migrations
- **CRITICAL**: Never use `prisma db push` to sync schema changes.
- **MANDATORY**: Always generate and run Prisma migrations using `prisma migrate dev` (for development/local sync) or `prisma migrate deploy` (for production/deploy) whenever the `schema.prisma` file is modified.
