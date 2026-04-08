import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userAgentRouter = createTRPCRouter({
  // List user's installed agents
  list: protectedProcedure.query(async ({ ctx }) => {
    const userAgents = await ctx.db.userAgent.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        agent: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    // Auto-install default agent if user has none
    if (userAgents.length === 0) {
      try {
        // Find unified Vibe Creator agent or any system agent
        const defaultAgent = await ctx.db.agent.findFirst({
          where: {
            id: 'agent_vibe_creator',
            isSystem: true,
            enabled: true,
          },
        }) ?? await ctx.db.agent.findFirst({
          where: {
            isSystem: true,
            enabled: true,
          },
        });

        if (defaultAgent) {
          const newUserAgent = await ctx.db.userAgent.create({
            data: {
              userId: ctx.session.user.id,
              agentId: defaultAgent.id,
              isDefault: true,
              enabled: true,
            },
            include: {
              agent: true,
            },
          });
          return [newUserAgent];
        }
      } catch (error) {
        // Log but don't fail - just return empty array
        console.error('Failed to auto-install default agent:', error);
      }
    }

    return userAgents;
  }),

  // List user's installed agents with full details
  listWithDetails: protectedProcedure.query(async ({ ctx }) => {
    const userAgents = await ctx.db.userAgent.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        agent: true, // Include the full Agent object
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // Auto-install default agent if user has none
    if (userAgents.length === 0) {
      try {
        // Find unified Vibe Creator agent or any system agent
        const defaultAgent = await ctx.db.agent.findFirst({
          where: {
            id: 'agent_vibe_creator',
            isSystem: true,
            enabled: true,
          },
        }) ?? await ctx.db.agent.findFirst({
          where: {
            isSystem: true,
            enabled: true,
          },
        });

        if (defaultAgent) {
          const newUserAgent = await ctx.db.userAgent.create({
            data: {
              userId: ctx.session.user.id,
              agentId: defaultAgent.id,
              isDefault: true,
              enabled: true,
            },
            include: {
              agent: true,
            },
          });
          return [newUserAgent];
        }
      } catch (error) {
        // Log but don't fail - just return empty array
        console.error('Failed to auto-install default agent:', error);
      }
    }

    return userAgents;
  }),

  // Get user's default agent
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const userAgent = await ctx.db.userAgent.findFirst({
      where: {
        userId: ctx.session.user.id,
        isDefault: true,
        enabled: true,
      },
      include: {
        agent: true,
      },
    });

    if (!userAgent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No default agent found. Please install an agent first.",
      });
    }

    return userAgent;
  }),

  // Get single user agent
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userAgent = await ctx.db.userAgent.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          agent: true,
        },
      });

      if (!userAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User agent not found",
        });
      }

      return userAgent;
    }),

  // Install a system agent
  install: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        setAsDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if agent exists and is a system agent
      const agent = await ctx.db.agent.findUnique({
        where: { id: input.agentId },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      if (!agent.isSystem) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only system agents can be installed",
        });
      }

      // Check if already installed
      const existing = await ctx.db.userAgent.findUnique({
        where: {
          userId_agentId: {
            userId,
            agentId: input.agentId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already installed this agent",
        });
      }

      // If setting as default, unset other defaults
      if (input.setAsDefault) {
        await ctx.db.userAgent.updateMany({
          where: {
            userId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      // Create user agent
      const userAgent = await ctx.db.userAgent.create({
        data: {
          userId,
          agentId: input.agentId,
          isDefault: input.setAsDefault,
          enabled: true,
        },
        include: {
          agent: true,
        },
      });

      return userAgent;
    }),

  // Uninstall an agent
  uninstall: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if exists
      const userAgent = await ctx.db.userAgent.findUnique({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!userAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User agent not found",
        });
      }

      // Delete
      await ctx.db.userAgent.delete({
        where: {
          id: input.id,
          userId,
        },
      });

      // If this was the default, set another one as default
      if (userAgent.isDefault) {
        const nextAgent = await ctx.db.userAgent.findFirst({
          where: {
            userId,
            enabled: true,
          },
          orderBy: { createdAt: "asc" },
        });

        if (nextAgent) {
          await ctx.db.userAgent.update({
            where: { id: nextAgent.id },
            data: { isDefault: true },
          });
        }
      }

      return { success: true };
    }),

  // Set an agent as default
  setDefault: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if exists
      const userAgent = await ctx.db.userAgent.findUnique({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!userAgent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User agent not found",
        });
      }

      // Unset other defaults
      await ctx.db.userAgent.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: input.id },
        },
        data: { isDefault: false },
      });

      // Set as default
      const updated = await ctx.db.userAgent.update({
        where: {
          id: input.id,
          userId,
        },
        data: { isDefault: true },
        include: {
          agent: true,
        },
      });

      return updated;
    }),

  // Update agent settings (custom instructions and model)
  updateSettings: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        customInstructions: z.string().optional().nullable(),
        customModel: z.string().optional().nullable(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const userId = ctx.session.user.id;

      // Check if exists
      const existing = await ctx.db.userAgent.findUnique({
        where: {
          id,
          userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User agent not found",
        });
      }

      // Update
      const updated = await ctx.db.userAgent.update({
        where: {
          id,
          userId,
        },
        data,
        include: {
          agent: true,
        },
      });

      return updated;
    }),
});

