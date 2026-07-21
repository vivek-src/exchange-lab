import { RedisManager } from "./redisClient.js";
import { Engine } from "./trade/Engine.js";

async function main() {
  const engine = new Engine();
  if (!process.env.WITH_SNAPSHOT) {
    await engine.setBaseBalances();
  }

  const redisManager = RedisManager.getInstance();
  console.log("Connected to redis");

  while (true) {
    const response = await redisManager.blockingPop("messages", 0);
    if (response) {
      engine.process(JSON.parse(response.element));
    }
  }
}

main();
