import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { createItem, listItems } from "./service";

export const exampleRouter = createTRPCRouter({
  /**
   * Create a new item (requires authentication)
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().max(10000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createItem({
        userId: ctx.session.user.id,
        title: input.title,
        content: input.content,
      });
    }),

  /**
   * List items for the current user (requires authentication)
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return listItems({
        userId: ctx.session.user.id,
        limit: input?.limit,
        cursor: input?.cursor,
      });
    }),

  /**
   * Public health check endpoint (no auth required)
   */
  health: publicProcedure.query(() => {
    return { status: "ok", module: "example" };
  }),
});
