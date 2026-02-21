-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "fromWalletId" TEXT,
ADD COLUMN     "price" DECIMAL(65,30),
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "ticker" TEXT,
ADD COLUMN     "toWalletId" TEXT;
