import { config } from "dotenv";
import { createClient } from "redis";
import type { RedisClientType } from "redis";
import type { EngineResponse, EngineRequest } from "@exchange-lab/shared";
import { Snowflake } from "@exchange-lab/engine";
const snowflake = new Snowflake(1);

config({ quiet: true });
const REDIS_URL = process.env.REDIS_URL ?? "redis://redis:6379";

export class EngineClient {
  private client: RedisClientType;
  private publisher: RedisClientType;
  private static instance: EngineClient;
  private connected = false;

  private constructor() {
    this.client = createClient({
      url: REDIS_URL,
    });

    this.publisher = createClient({
      url: REDIS_URL,
    });

    this.client.on("error", console.error);
    this.publisher.on("error", console.error);
  }
  public static getInstance() {
    if (!this.instance) {
      this.instance = new EngineClient();
    }
    return this.instance;
  }
  public async connect() {
    if (this.connected) return;

    await this.client.connect();
    await this.publisher.connect();

    this.connected = true;
    console.log("Connected to Redis");
  }
  public sendRequest(message: EngineRequest) {
    return new Promise<EngineResponse>((resolve, reject) => {
      const id = snowflake.generate().toString();

      const timeout = setTimeout(() => {
        this.client.unsubscribe(id);
        reject(new Error("Engine timeout"));
      }, 7000);

      this.client.subscribe(id, (message) => {
        clearTimeout(timeout);
        this.client.unsubscribe(id);
        resolve(JSON.parse(message));
      });
      this.publisher.lPush(
        "messages",
        JSON.stringify({ clientId: id, message }),
      );
    });
  }
}
