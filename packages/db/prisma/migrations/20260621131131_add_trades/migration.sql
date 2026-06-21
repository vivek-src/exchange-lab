-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "quoteQuantity" DECIMAL(65,30) NOT NULL,
    "isBuyerMaker" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trades_market_timestamp_idx" ON "trades"("market", "timestamp" DESC);
