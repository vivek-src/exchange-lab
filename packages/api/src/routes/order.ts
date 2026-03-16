import { Router } from "express";
import { EngineClient } from "../redisClient.js";

import {
  CREATE_ORDER,
  CANCEL_ORDER,
  GET_OPEN_ORDERS,
} from "@exchange-lab/shared";

import {
  createOrderSchema,
  cancelOrderSchema,
  getOpenOrdersSchema,
} from "../schema/orderSchema.js";

export const orderRouter = Router();

orderRouter.post("/", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid order input",
      details: parsed.error.issues,
    });
  }
  //send order to the redis queue
  try {
    const response = await EngineClient.getInstance().sendRequest({
      type: CREATE_ORDER,
      data: parsed.data,
    });

    return res.status(201).json(response.payload);
  } catch (err) {
    return res.status(500).json({ error: "Engine error" });
  }
});

//DELETE ORDER
orderRouter.delete("/", async (req, res) => {
  const parsed = cancelOrderSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid cancel request",
      details: parsed.error.flatten(),
    });
  }

  try {
    const response = await EngineClient.getInstance().sendRequest({
      type: CANCEL_ORDER,
      data: parsed.data,
    });

    return res.json(response.payload);
  } catch {
    return res.status(500).json({ error: "Engine error" });
  }
});
orderRouter.get("/open", async (req, res) => {
  const parsed = getOpenOrdersSchema.safeParse({
    userId: req.query.userId,
    market: req.query.market,
  });

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query params",
      details: parsed.error.flatten(),
    });
  }

  try {
    const response = await EngineClient.getInstance().sendRequest({
      type: GET_OPEN_ORDERS,
      data: parsed.data,
    });

    return res.json(response.payload);
  } catch {
    return res.status(500).json({ error: "Engine error" });
  }
});
