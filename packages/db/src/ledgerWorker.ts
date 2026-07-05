import { Client } from "pg";
import { createClient } from "redis";
import "dotenv/config";

// Ensure your type definition matches what your matching engine sends
interface DbMessage {
  type: "TRADE_ADDED";
  data: {
    id: string;
    market: string;
    price: number;
    quantity: number;
    quoteQuantity: number; // totalCost (price * quantity)
    isBuyerMaker: boolean;
    timestamp: string;
    buyerId: string;
    sellerId: string;
  };
}

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await pgClient.connect();
  console.log("Connected to PostgreSQL via pg");

  const redisClient = createClient();
  await redisClient.connect();
  console.log("Connected to Redis");

  while (true) {
    try {
      const response = await redisClient.brPop("db_processor", 0);
      if (!response) continue;

      const data: DbMessage = JSON.parse(response.element);

      if (data.type === "TRADE_ADDED") {
        const { id, market, buyerId, sellerId, isBuyerMaker } = data.data;

        const price = Number(data.data.price);
        const quantity = Number(data.data.quantity);
        const quoteQuantity = Number(data.data.quoteQuantity);

        const [baseAsset] = market.split("_"); // e.g., "VIVEK" or "RIL"
        const timestamp = new Date(data.data.timestamp);

        // START TRANSACTION BLOCK FOR ATOMICITY
        await pgClient.query("BEGIN");

        try {
          // 1. Fetch current wallet details for both parties to get latest balances
          const buyerRes = await pgClient.query(
            'SELECT balance, "assetsHeld" FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
            [buyerId],
          );
          const sellerRes = await pgClient.query(
            'SELECT balance, "assetsHeld" FROM "Wallet" WHERE "userId" = $1 FOR UPDATE',
            [sellerId],
          );

          if (buyerRes.rows.length === 0 || sellerRes.rows.length === 0) {
            throw new Error(
              `Wallet not found for buyer ${buyerId} or seller ${sellerId}`,
            );
          }

          const buyerWallet = buyerRes.rows[0];
          const sellerWallet = sellerRes.rows[0];
          if (!baseAsset) {
            throw new Error(`Invalid market string format received: ${market}`);
          }

          // Parse JSON asset fields safely
          const buyerAssets =
            typeof buyerWallet.assetsHeld === "string"
              ? JSON.parse(buyerWallet.assetsHeld)
              : buyerWallet.assetsHeld || {};
          const sellerAssets =
            typeof sellerWallet.assetsHeld === "string"
              ? JSON.parse(sellerWallet.assetsHeld)
              : sellerWallet.assetsHeld || {};

          // 2. Calculate new states
          const newBuyerBalance = Number(buyerWallet.balance) - quoteQuantity;
          // Support both object types or standard numbers depending on your state engine
          const currentBuyerAsset =
            typeof buyerAssets[baseAsset] === "object"
              ? buyerAssets[baseAsset].available || 0
              : buyerAssets[baseAsset] || 0;
          buyerAssets[baseAsset] = currentBuyerAsset + quantity;

          const newSellerBalance = Number(sellerWallet.balance) + quoteQuantity;
          const currentSellerAsset =
            typeof sellerAssets[baseAsset] === "object"
              ? sellerAssets[baseAsset].available || 0
              : sellerAssets[baseAsset] || 0;
          sellerAssets[baseAsset] = currentSellerAsset - quantity;

          // 3. Update Buyer Wallet
          await pgClient.query(
            'UPDATE "Wallet" SET balance = $1, "assetsHeld" = $2, "updatedAt" = NOW() WHERE "userId" = $3',
            [newBuyerBalance, JSON.stringify(buyerAssets), buyerId],
          );

          // 4. Update Seller Wallet
          await pgClient.query(
            'UPDATE "Wallet" SET balance = $1, "assetsHeld" = $2, "updatedAt" = NOW() WHERE "userId" = $3',
            [newSellerBalance, JSON.stringify(sellerAssets), sellerId],
          );

          // 5. Create Buyer Transaction Record
          await pgClient.query(
            `
            INSERT INTO "Transaction" (id, "walletId", type, category, description, amount, "balanceAfter", ticker, quantity, price, "createdAt")
            VALUES ($1, $2, 'DEBIT'::"TransactionType", 'ORDER_BUY'::"TransactionCategory", $3, $4, $5, $6, $7, $8, NOW())
          `,
            [
              id,
              buyerId,
              `Bought ${quantity} ${baseAsset} @ ₹${price}`,
              quoteQuantity,
              newBuyerBalance,
              baseAsset,
              quantity,
              price,
            ],
          );

          // 6. Create Seller Transaction Record
          await pgClient.query(
            `
            INSERT INTO "Transaction" (id, "walletId", type, category, description, amount, "balanceAfter", ticker, quantity, price, "createdAt")
            VALUES ($1, $2, 'CREDIT'::"TransactionType", 'ORDER_SELL'::"TransactionCategory", $3, $4, $5, $6, $7, $8, NOW())
          `,
            [
              id,
              sellerId,
              `Sold ${quantity} ${baseAsset} @ ₹${price}`,
              quoteQuantity,
              newSellerBalance,
              baseAsset,
              quantity,
              price,
            ],
          );

          // 7. Save Public Trade Entry
          await pgClient.query(
            `
            INSERT INTO trades (id, market, price, quantity, "quoteQuantity", "isBuyerMaker", timestamp) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
            [
              id,
              market,
              price,
              quantity,
              quoteQuantity,
              isBuyerMaker,
              timestamp,
            ],
          );

          // COMMIT ALL CHANGES ACROSS TABLES GIVING 100% INTEGRITY
          await pgClient.query("COMMIT");
          console.log(
            `Successfully completed execution lifecycle for Trade ${id}`,
          );
        } catch (txError) {
          await pgClient.query("ROLLBACK");
          throw txError;
        }
      }
    } catch (error) {
      console.error("Worker Error: Failed to process message context", error);
    }
  }
}

main();
