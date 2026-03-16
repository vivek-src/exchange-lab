import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { randomUUID } from "crypto";
import type { EngineResponse, EngineRequest } from "@exchange-lab/shared";

export class EngineClient {
  private client: RedisClientType;
  private publisher: RedisClientType;
  private static instance: EngineClient;

  private constructor() {
    this.client = createClient();
    this.client.connect();
    this.publisher = createClient();
    this.publisher.connect();
  }
  public static getInstance() {
    if (!this.instance) {
      this.instance = new EngineClient();
    }
    return this.instance;
  }
  public sendRequest(message: EngineRequest) {
    return new Promise<EngineResponse>((resolve, reject) => {
      const id = randomUUID();

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
