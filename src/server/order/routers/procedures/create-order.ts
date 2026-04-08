import { protectedProcedure } from "@/server/api/trpc";
import { createOrderSchema } from "../../schemas/order";
import { createOrder } from "../../services/create-order";

export const createOrderProcedure = protectedProcedure
  .input(createOrderSchema)
  .mutation(async ({ ctx, input }) => {
    const order = await createOrder({
      userId: ctx.session.user.id,
      productId: input.productId,
      type: input.type,
    });

    return order;
  });

