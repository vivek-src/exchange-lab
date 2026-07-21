import { WebSocketServer } from "ws";
import { UserManager } from "./userManager.js";
import { SubscriptionManager } from "./subscriptionManager.js";

const port = 3002;
const wss = new WebSocketServer({ port });
console.log(`WS Live on ${port}`);

await SubscriptionManager.getInstance().connect();

wss.on("connection", (ws) => {
  UserManager.getInstance().addUser(ws);
});
