import { z } from "zod";

export const orderInputSchema = z.object({
  baseAsset: z
    .string()
    .min(1)
    .regex(/^[A-Z]+$/),

  quoteAsset: z
    .string()
    .min(1)
    .regex(/^[A-Z]+$/),

  side: z.enum(["buy", "sell"]), //bid = buy, ask = sell
  orderType: z.enum(["limit", "market"]),
  price: z.number().positive(),
  quantity: z.number().positive(),
  executionType: z.enum(["ioc"]).optional(),
});

export type orderDataType = z.infer<typeof orderInputSchema>;
