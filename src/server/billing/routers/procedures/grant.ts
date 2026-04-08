import { protectedProcedure } from "@/server/api/trpc";
import { GrantInputSchema, GrantOutputSchema } from "../../schemas";
import { grant } from "../../services/grant";

export const grantProcedure = protectedProcedure
  .input(GrantInputSchema)
  .output(GrantOutputSchema)
  .mutation(async ({ input }) => {
    return grant(input);
  });

