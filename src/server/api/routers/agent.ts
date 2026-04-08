import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

/**
 * System Agent Router (Read-only)
 * 
 * Manages system-level agents that users can install via UserAgent
 */
export const agentRouter = createTRPCRouter({
  // List all system agents (public, for browsing)
  listSystem: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.agent.findMany({
      where: {
        isSystem: true,
        enabled: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Get single agent details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.agent.findUnique({
        where: {
          id: input.id,
        },
      });
    }),
});
