import { createClient } from "redis";
import { Engine } from "./trade/Engine.js";

async function main() {
  const engine = new Engine();
  if (!process.env.WITH_SNAPSHOT) {
    await engine.setBaseBalances();
  }

  const redisClient = createClient();
  await redisClient.connect();
  console.log("Connected to redis");

  while (true) {
    const response = await redisClient.brPop("messages", 0);
    if (response) {
      engine.process(JSON.parse(response.element));
    }
  }
}

main();
