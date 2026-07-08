import { Router } from "express";
import { prisma } from "@exchange-lab/db";

export const tradesRouter = Router();

// GET /api/v1/trades?market=SOL_USDC&limit=50

tradesRouter.get("/", async (req, res) => {
  try {
    const { market, limit } = req.query;

    if (!market || typeof market !== "string") {
      return res.status(400).json({ error: "market is required" });
    }

    const tradeLimit = Math.min(
      parseInt((limit as string) ?? "50", 10) || 50,
      500, // cap to avoid someone requesting the whole table
    );

    const trades = await prisma.trades.findMany({
      where: { market },
      orderBy: { timestamp: "desc" },
      take: tradeLimit,
      select: {
        id: true,
        price: true,
        quantity: true,
        quoteQuantity: true,
        isBuyerMaker: true,
        timestamp: true,
      },
    });

    // Serialize Decimal fields to string (Prisma returns Decimal objects for numeric columns)
    const serialized = trades.map((t) => ({
      id: t.id,
      price: t.price.toString(),
      quantity: t.quantity.toString(),
      quoteQuantity: t.quoteQuantity.toString(),
      isBuyerMaker: t.isBuyerMaker,
      timestamp: t.timestamp.getTime(),
    }));

    res.json(serialized);
  } catch (err) {
    console.error("GET /trades error:", err);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});
