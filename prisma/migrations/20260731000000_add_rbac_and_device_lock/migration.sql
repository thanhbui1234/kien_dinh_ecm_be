-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterColumn Role with safe cast
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ('ADMIN'::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN'::"Role";
