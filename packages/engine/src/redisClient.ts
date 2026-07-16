import type { EngineResponse } from "@exchange-lab/shared";
import { createClient } from "redis";
import type { RedisClientType } from "redis";
import type { WsMessage } from "@exchange-lab/shared";
import type { DbMessage } from "@exchange-lab/shared";

export class RedisManager {
  private client: RedisClientType;
  private static instance: RedisManager;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL ?? "redis://redis:6379",
    });
    this.client.connect().catch(console.error);
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public pushMessage(message: DbMessage) {
    this.client.lPush("db_processor", JSON.stringify(message));
  }

  public publishMessage(channel: string, message: WsMessage) {
    this.client.publish(channel, JSON.stringify(message));
  }

  public sendToApi(clientId: string, message: EngineResponse) {
    this.client.publish(clientId, JSON.stringify(message));
  }
}
