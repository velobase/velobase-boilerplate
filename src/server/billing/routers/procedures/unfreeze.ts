import { protectedProcedure } from "@/server/api/trpc";
import { UnfreezeInputSchema, UnfreezeOutputSchema } from "../../schemas";
import { unfreeze } from "../../services/unfreeze";

export const unfreezeProcedure = protectedProcedure
  .input(UnfreezeInputSchema)
  .output(UnfreezeOutputSchema)
  .mutation(async ({ input }) => {
    return unfreeze(input);
  });

