import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { createCryptoInvoice } from "../../services/create-crypto-invoice";

const inputSchema = z.object({
  paymentId: z.string().min(1),
});

export const createCryptoInvoiceProcedure = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }) => {
    // Service handles 429 internally and returns { status: "RATE_LIMITED" } instead of throwing.
    // No need to catch/convert errors here — only real failures will propagate.
    return await createCryptoInvoice({ userId: ctx.session.user.id, paymentId: input.paymentId });
  });
