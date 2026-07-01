import { WebSocketServer } from "ws";
import { UserManager } from "./userManager.js";

const port = 3001;
const wss = new WebSocketServer({ port });
console.log(`Web Socker Server Live on ${port}`);

wss.on("connection", (ws) => {
  UserManager.getInstance().addUser(ws);
});
