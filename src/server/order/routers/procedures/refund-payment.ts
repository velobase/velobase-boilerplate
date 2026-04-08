import { protectedProcedure } from "@/server/api/trpc";
import { refundPaymentSchema } from "../../schemas/payment";
import { refundPayment } from "../../services/refund-payment";

export const refundPaymentProcedure = protectedProcedure
  .input(refundPaymentSchema)
  .mutation(async ({ ctx, input }) => {
    const payment = await refundPayment({
      paymentId: input.paymentId,
      userId: ctx.session.user.id,
      amount: input.amount,
      reason: input.reason,
    });

    return payment;
  });

