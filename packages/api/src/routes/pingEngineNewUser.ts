import { Router } from "express";
import { EngineClient } from "../redisClient.js";
import { ADD_USER } from "@exchange-lab/shared";

export const pingEngine = Router();

pingEngine.post("/", async (req, res) => {
  let { userId } = req.body;
  if (!userId) {
    res.json("User Id is Required");
  }
  try {
    const response = await EngineClient.getInstance().sendRequest({
      type: ADD_USER,
      data: {
        userId,
      },
    });
    return res.status(201).json(response.payload);
  } catch {
    return res.status(500).json({ error: "Engine error" });
  }
});
