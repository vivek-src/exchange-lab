import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { UserManager } from "./userManager.js";
import { config } from "dotenv";

config({ quiet: true });

const REDIS_URL = process.env.REDIS_URL ?? "redis://redis:6379";

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<string, string[]> = new Map();
  private reverseSubscriptions: Map<string, string[]> = new Map();
  private redisClient: RedisClientType;

  private constructor() {
    this.redisClient = createClient({
      url: REDIS_URL,
    });

    this.redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new SubscriptionManager();
    }
    return this.instance;
  }

  public async connect() {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  public subscribe(userId: string, subscription: string) {
    if (this.subscriptions.get(userId)?.includes(subscription)) {
      return;
    }

    this.subscriptions.set(
      userId,
      (this.subscriptions.get(userId) || []).concat(subscription),
    );

    this.reverseSubscriptions.set(
      subscription,
      (this.reverseSubscriptions.get(subscription) || []).concat(userId),
    );

    if (this.reverseSubscriptions.get(subscription)?.length === 1) {
      this.redisClient.subscribe(subscription, this.redisCallbackHandler);
    }
  }

  private redisCallbackHandler = (message: string, channel: string) => {
    const parsedMessage = JSON.parse(message);

    this.reverseSubscriptions.get(channel)?.forEach((userId) => {
      UserManager.getInstance().getUser(userId)?.emit(parsedMessage);
    });
  };

  public unsubscribe(userId: string, subscription: string) {
    const subscriptions = this.subscriptions.get(userId);

    if (subscriptions) {
      this.subscriptions.set(
        userId,
        subscriptions.filter((s) => s !== subscription),
      );
    }

    const reverseSubscriptions = this.reverseSubscriptions.get(subscription);

    if (reverseSubscriptions) {
      this.reverseSubscriptions.set(
        subscription,
        reverseSubscriptions.filter((s) => s !== userId),
      );

      if (this.reverseSubscriptions.get(subscription)?.length === 0) {
        this.reverseSubscriptions.delete(subscription);
        this.redisClient.unsubscribe(subscription);
      }
    }
  }

  public userLeft(userId: string) {
    console.log("user left " + userId);

    this.subscriptions.get(userId)?.forEach((s) => {
      this.unsubscribe(userId, s);
    });
  }

  public getSubscriptions(userId: string) {
    return this.subscriptions.get(userId) || [];
  }
}
