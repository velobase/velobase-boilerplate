import { protectedProcedure } from "@/server/api/trpc";
import { getOrderSchema } from "../../schemas/order";
import { getOrder } from "../../services/get-order";

export const getOrderProcedure = protectedProcedure
  .input(getOrderSchema)
  .query(async ({ ctx, input }) => {
    const order = await getOrder(input.orderId);

    if (order.userId !== ctx.session.user.id) {
      throw new Error("Unauthorized");
    }

    return order;
  });

