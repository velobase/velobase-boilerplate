import { protectedProcedure } from "@/server/api/trpc";
import { PostConsumeInputSchema, PostConsumeOutputSchema } from "../../schemas";
import { postConsume } from "../../services/post-consume";

export const postConsumeProcedure = protectedProcedure
  .input(PostConsumeInputSchema)
  .output(PostConsumeOutputSchema)
  .mutation(async ({ input }) => {
    return postConsume(input);
  });


