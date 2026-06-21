import { Client } from "pg";
import { createClient } from "redis";
import type { DbMessage } from "@exchange-lab/shared";

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
async function main() {
  try {
    await pgClient.connect();
    console.log("Connected to PostgreSQL via pg");
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  }

  const redisClient = createClient();
  await redisClient.connect();
  console.log("Connected to Redis");

  while (true) {
    try {
      const response = await redisClient.brPop("db_processor", 0);

      if (response) {
        const data: DbMessage = JSON.parse(response.element);

        if (data.type === "TRADE_ADDED") {
          const id = data.data.id;
          const market = data.data.market;
          const price = data.data.price;
          const quantity = data.data.quantity;
          const quoteQuantity = data.data.quoteQuantity;
          const isBuyerMaker = data.data.isBuyerMaker;
          const timestamp = new Date(data.data.timestamp);

          const query = `
            INSERT INTO Trades (id, market, price, quantity, "quoteQuantity", "isBuyerMaker", timestamp) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;

          const values = [
            id,
            market,
            price,
            quantity,
            quoteQuantity,
            isBuyerMaker,
            timestamp,
          ];

          await pgClient.query(query, values);
          console.log(
            `Saved trade ${id}: ${market} | Qty: ${quantity} @ ₹${price}`,
          );
        }
      }
    } catch (error) {
      console.error("Worker Error: Failed to process message", error);
    }
  }
}

main();
