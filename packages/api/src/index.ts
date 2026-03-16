import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "Server is Live" });
});

app.use("/api/v1/order", orderRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
