import { protectedProcedure } from "@/server/api/trpc";
import { listOrdersSchema } from "../../schemas/order";
import { listOrders } from "../../services/list-orders";

export const listOrdersProcedure = protectedProcedure
  .input(listOrdersSchema)
  .query(async ({ ctx, input }) => {
    const result = await listOrders({
      userId: ctx.session.user.id,
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return result;
  });

