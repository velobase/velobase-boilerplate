import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { SALES_PAUSED } from "@/config/decommission";
import { createCheckoutSessionSchema } from "../../schemas/payment";
import { checkout } from "../../services/checkout";
import { asyncSendBackendAlert } from "@/lib/lark/notifications";

export const checkoutProcedure = protectedProcedure
  .input(createCheckoutSessionSchema)
  .mutation(async ({ ctx, input }) => {
    if (SALES_PAUSED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "SALES_PAUSED",
      });
    }

    try {
    const result = await checkout({
      userId: ctx.session.user.id,
      productId: input.productId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      gateway: input.gateway,
                    cryptoCurrency: input.cryptoCurrency,
                    quantity: input.quantity,
      metadata: input.metadata,
      requestHeaders: ctx.headers,
      clientIp: ctx.clientIp,
    });
    return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      asyncSendBackendAlert({
        title: "Checkout failed",
        severity: "error",
        source: "payment",
        service: "order.checkout",
        user: ctx.session.user.id,
        errorName: e.name,
        errorMessage: e.message,
        stack: e.stack,
        metadata: {
          input,
        },
      });
      throw err;
    }
  });
