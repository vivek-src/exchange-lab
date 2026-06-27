import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL for K-line aggregation");
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  }

  setInterval(async () => {
    try { 
      await client.query("REFRESH MATERIALIZED VIEW CONCURRENTLY klines_1m");
    } catch (e) {
      console.error("Failed to refresh 1m K-lines:", e);
    }
  }, 1000 * 10);

  setInterval(async () => {
    try {
      await client.query("REFRESH MATERIALIZED VIEW CONCURRENTLY klines_1h");
    } catch (e) {
      console.error("Failed to refresh 1h K-lines:", e);
    }
  }, 1000 * 60);

  setInterval(
    async () => {
      try {
        await client.query("REFRESH MATERIALIZED VIEW CONCURRENTLY klines_1w");
      } catch (e) {
        console.error("Failed to refresh 1w K-lines:", e);
      }
    },
    1000 * 60 * 60,
  );
}

main();
