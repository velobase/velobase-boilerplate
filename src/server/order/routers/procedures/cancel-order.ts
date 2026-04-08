import { protectedProcedure } from "@/server/api/trpc";
import { cancelOrderSchema } from "../../schemas/order";
import { cancelOrder } from "../../services/cancel-order";

export const cancelOrderProcedure = protectedProcedure
  .input(cancelOrderSchema)
  .mutation(async ({ ctx, input }) => {
    const order = await cancelOrder({
      orderId: input.orderId,
      userId: ctx.session.user.id,
      reason: input.reason,
    });

    return order;
  });

