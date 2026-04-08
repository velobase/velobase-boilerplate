import { protectedProcedure } from "@/server/api/trpc";
import { ConsumeInputSchema, ConsumeOutputSchema } from "../../schemas";
import { consume } from "../../services/consume";

export const consumeProcedure = protectedProcedure
  .input(ConsumeInputSchema)
  .output(ConsumeOutputSchema)
  .mutation(async ({ input }) => {
    return consume(input);
  });

