import { db } from "@/server/db";
import type { Prisma, ProductType } from "@prisma/client";

interface CreateProductParams {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  type: ProductType;
  interval?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createProduct({
  name,
  description,
  price,
  currency = "usd",
  type,
  interval,
  metadata,
}: CreateProductParams) {
  if (type === "SUBSCRIPTION" && !interval) {
    throw new Error("Subscription products must have an interval");
  }

  const product = await db.product.create({
    data: {
      name,
      description,
      price,
      currency,
      type,
      interval,
      status: "ACTIVE",
      metadata,
    },
  });

  return product;
}

