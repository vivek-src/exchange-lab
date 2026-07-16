import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order.js";
import { depthRouter } from "./routes/depth.js";
import { tradesRouter } from "./routes/trades.js";
import { klineRouter } from "./routes/klines.js";
import { tickersRouter } from "./routes/ticker.js";
import { pingEngine } from "./routes/pingEngineNewUser.js";
import { EngineClient } from "./redisClient.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

await EngineClient.getInstance().connect();

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "Server is Live" });
});

app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineRouter);
app.use("/api/v1/tickers", tickersRouter);
app.use("/api/v1/newuser", pingEngine);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
