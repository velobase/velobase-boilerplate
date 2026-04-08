import { protectedProcedure } from "@/server/api/trpc";
import { listPaymentsSchema } from "../../schemas/payment";
import { listPayments } from "../../services/list-payments";

export const listPaymentsProcedure = protectedProcedure
  .input(listPaymentsSchema)
  .query(async ({ ctx, input }) => {
    const result = await listPayments({
      userId: ctx.session.user.id,
      orderId: input.orderId,
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    });

    return result;
  });

