/*
  Warnings:

  - The primary key for the `trades` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "trades" DROP CONSTRAINT "trades_pkey",
ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMPTZ(3),
ADD CONSTRAINT "trades_pkey" PRIMARY KEY ("id", "timestamp");
