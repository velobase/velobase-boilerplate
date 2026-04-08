import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const projectRouter = createTRPCRouter({
  // List user's projects
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "archived", "deleted"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: { userId: string; status?: string } = {
        userId: ctx.session.user.id,
      };

      if (input.status) {
        where.status = input.status;
      }

      return ctx.db.project.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              documents: true,
              imageAssets: true,
            },
          },
        },
      });
    }),

  // Get a single project with details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // Ensure ownership
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),

  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(100),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          description: input.description,
          status: "active",
        },
      });

      return project;
    }),

  // Update a project
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required").max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        status: z.enum(["active", "archived", "deleted"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.project.findUnique({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...data } = input;

      const project = await ctx.db.project.update({
        where: { id: input.id },
        data,
      });

      return project;
    }),

  // Delete a project (soft delete by setting status to 'deleted')
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.project.findUnique({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Soft delete
      await ctx.db.project.update({
        where: { id: input.id },
        data: { status: "deleted" },
      });

      return { success: true };
    }),

  // Get conversations for a project
  getConversations: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId, userId: ctx.session.user.id },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return ctx.db.conversation.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.session.user.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: input.limit,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
          isArchived: true,
        },
      });
    }),
});

