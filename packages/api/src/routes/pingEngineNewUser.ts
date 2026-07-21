import { Router } from "express";
import { EngineClient } from "../redisClient.js";
import { ADD_USER } from "@exchange-lab/shared";
import { prisma } from "@exchange-lab/db";

export const pingEngine = Router();

pingEngine.post("/", async (req, res) => {
  let { userId } = req.body;
  if (!userId) {
    return res.status(400).json("User Id is Required");
  }
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({ error: "User wallet not found in DB" });
    }

    const response = await EngineClient.getInstance().sendRequest({
      type: ADD_USER,
      data: {
        userId,
        wallet,
      },
    });
    return res.status(201).json(response.payload);
  } catch (error) {
    console.error("Error pinging engine for new user:", error);
    return res.status(500).json({ error: "Engine error" });
  }
});
