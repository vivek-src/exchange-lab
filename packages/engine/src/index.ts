import { createClient } from "redis";
import { Engine } from "./trade/Engine";

async function main() {
  // const engine = await Engine.create();
  const redisClient = createClient();
  await redisClient.connect();
  console.log("Connected to redis");

  while (true) {
    const response = await redisClient.rPop("Messages" as string);
    if (!response) {
    } else {
      engine.process(JSON.parse(response));
    }
  }
}

main();
