import { WebSocket } from "ws";
import { randomUUID } from "crypto";
import { User } from "./user.js";
import { SubscriptionManager } from "./subscriptionManager.js";

export class UserManager {
  private static instance: UserManager;
  private users: Map<string, User> = new Map();

  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new UserManager();
    }
    return this.instance;
  }

  public addUser(ws: WebSocket) {
    const id = randomUUID();
    const user = new User(id, ws);
    this.users.set(id, user);
    this.registerOnClose(ws, id);
    return user;
  }

  private registerOnClose(ws: WebSocket, id: string) {
    ws.on("close", () => {
      this.users.delete(id);
      SubscriptionManager.getInstance().userLeft(id);
    });
  }

  public getUser(id: string) {
    return this.users.get(id);
  }
}
