import { protectedProcedure } from "@/server/api/trpc";
import { confirmPaymentSchema } from "../../schemas/payment";
import { confirmPaymentById } from "../../services/confirm-payment";
import { initOrderProviders } from "../../services/init-providers";

export const confirmPaymentProcedure = protectedProcedure
  .input(confirmPaymentSchema)
  .mutation(async ({ ctx, input }) => {
    initOrderProviders();
    return await confirmPaymentById(input.paymentId, ctx.session.user.id);
  });



