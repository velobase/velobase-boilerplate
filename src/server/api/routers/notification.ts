import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import type { NotificationType } from "@prisma/client";

export const notificationRouter = createTRPCRouter({
  // 1. Verify Token & Get Preferences
  getPreferencesByToken: publicProcedure
    .input(z.object({ token: z.string().optional().nullable() }))
    .query(async ({ ctx, input }) => {
      let userId: string | null = null;

      // 1. Try Token
      if (input.token) {
        userId = await verifyUnsubscribeToken(input.token);
      }

      // 2. Try Session (if token invalid or missing)
      if (!userId && ctx.session?.user?.id) {
        userId = ctx.session.user.id;
      }

      // 3. Fail
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token. Please sign in.",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      const prefs = await ctx.db.userNotificationPreference.findMany({
        where: { userId },
      });

      const getEnabled = (type: NotificationType) => 
        prefs.find(p => p.type === type)?.emailEnabled ?? true;

      return {
        marketing: getEnabled("MARKETING_PROMO"),
        product: getEnabled("PRODUCT_UPDATE"),
        newsletter: getEnabled("NEWSLETTER"),
        billing: true,
      };
    }),

  // 2. Update Preferences
  updatePreferencesByToken: publicProcedure
    .input(z.object({
      token: z.string().optional().nullable(),
      marketing: z.boolean().optional(),
      product: z.boolean().optional(),
      newsletter: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let userId: string | null = null;

      // 1. Try Token
      if (input.token) {
        userId = await verifyUnsubscribeToken(input.token);
      }

      // 2. Try Session
      if (!userId && ctx.session?.user?.id) {
        userId = ctx.session.user.id;
      }

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token. Please sign in.",
        });
      }

      const updates = [];

      if (input.marketing !== undefined) {
        updates.push(ctx.db.userNotificationPreference.upsert({
          where: { userId_type: { userId, type: "MARKETING_PROMO" } },
          create: { userId, type: "MARKETING_PROMO", emailEnabled: input.marketing },
          update: { emailEnabled: input.marketing },
        }));
      }

      if (input.product !== undefined) {
        updates.push(ctx.db.userNotificationPreference.upsert({
          where: { userId_type: { userId, type: "PRODUCT_UPDATE" } },
          create: { userId, type: "PRODUCT_UPDATE", emailEnabled: input.product },
          update: { emailEnabled: input.product },
        }));
      }

      if (input.newsletter !== undefined) {
        updates.push(ctx.db.userNotificationPreference.upsert({
          where: { userId_type: { userId, type: "NEWSLETTER" } },
          create: { userId, type: "NEWSLETTER", emailEnabled: input.newsletter },
          update: { emailEnabled: input.newsletter },
        }));
      }

      await Promise.all(updates);
      return { success: true };
    }),
});
