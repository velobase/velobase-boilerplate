import { protectedProcedure } from "@/server/api/trpc";
import { getPaymentSchema } from "../../schemas/payment";
import { getPayment } from "../../services/get-payment";

export const getPaymentProcedure = protectedProcedure
  .input(getPaymentSchema)
  .query(async ({ ctx, input }) => {
    const payment = await getPayment(input.paymentId);

    if (payment.userId !== ctx.session.user.id) {
      throw new Error("Unauthorized");
    }

    return payment;
  });

