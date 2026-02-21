/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Token` table. All the data in the column will be lost.
  - You are about to drop the column `forgotPassToken` on the `Token` table. All the data in the column will be lost.
  - You are about to drop the column `forgotPassTokenExp` on the `Token` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Token` table. All the data in the column will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Token" DROP COLUMN "createdAt",
DROP COLUMN "forgotPassToken",
DROP COLUMN "forgotPassTokenExp",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "VerificationToken";
