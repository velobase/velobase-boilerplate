import { z } from "zod";

export const createOrderSchema = z.object({
  productId: z.string().min(1),
  type: z
    .enum(["NEW_PURCHASE", "RENEWAL", "UPGRADE", "DOWNGRADE"])
    .default("NEW_PURCHASE"),
});

export const getOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const listOrdersSchema = z.object({
  status: z
    .enum(["PENDING", "FULFILLED", "CANCELLED", "EXPIRED", "REFUNDED"])
    .optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
});

