import { protectedProcedure } from "@/server/api/trpc";
import { FreezeInputSchema, FreezeOutputSchema } from "../../schemas";
import { freeze } from "../../services/freeze";

export const freezeProcedure = protectedProcedure
  .input(FreezeInputSchema)
  .output(FreezeOutputSchema)
  .mutation(async ({ input }) => {
    return freeze(input);
  });

