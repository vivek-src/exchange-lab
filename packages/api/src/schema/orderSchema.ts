import { z } from "zod";

export const createOrderSchema = z.object({
  userId: z.string().min(1),
  market: z
    .string()
    .min(3)
    .regex(/^[A-Z]+$/),
  side: z.enum(["buy", "sell"]),
  orderType: z.enum(["limit", "market"]),
  price: z.string().regex(/^\d+(\.\d+)?$/, "Price must be a valid number"),
  quantity: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Quantity must be a valid number"),
  executionType: z.enum(["ioc"]).optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  market: z.string().min(1),
});

export const getOpenOrdersSchema = z.object({
  userId: z.string().min(1),
  market: z.string().min(1),
});
