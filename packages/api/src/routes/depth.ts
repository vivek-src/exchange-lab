import { Router } from "express";
import { EngineClient } from "../redisClient.js";
import { GET_DEPTH } from "@exchange-lab/shared";

export const depthRouter = Router();

depthRouter.get("/", async (req, res) => {
  const { market } = req.query;
  try {
    const response = await EngineClient.getInstance().sendRequest({
      type: GET_DEPTH,
      data: {
        market: market as string,
      },
    });

    return res.status(200).json(response.payload);
  } catch {
    return res.status(500).json({ error: "Engine error" });
  }
});
