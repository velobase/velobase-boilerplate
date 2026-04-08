/**
 * tRPC router for Telegram account management.
 *
 * Provides:
 * - generateBindingToken: Create a short Redis-backed deep link for binding Telegram account
 * - getBindingStatus: Check if Telegram is connected
 * - unbind: Disconnect Telegram account
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { SALES_PAUSED } from "@/config/decommission";
import { createBindingToken, createBindPayToken } from "./binding-token";

export const telegramRouter = createTRPCRouter({
  /**
   * Get current Telegram binding status.
   */
  getBindingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { telegramId: true },
    });

    return {
      isBound: !!user?.telegramId,
      telegramId: user?.telegramId ?? null,
      botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null,
    };
  }),

  /**
   * Generate a short binding token (Redis-backed) and return a Telegram deep link.
   * Token expires in 15 minutes and is one-time use.
   */
  generateBindingToken: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

    if (!botUsername) {
      throw new Error("Telegram Bot is not configured");
    }

    // Check if already bound
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });

    if (user?.telegramId) {
      return {
        alreadyBound: true,
        deepLink: null,
      };
    }

    // Generate short Redis-backed token (8 chars, fits Telegram's 64-char deep link limit)
    const token = await createBindingToken(userId);
    const deepLink = `https://t.me/${botUsername}?start=bind_${token}`;

    return {
      alreadyBound: false,
      deepLink,
    };
  }),

  /**
   * Generate a signed bind-pay token that combines account binding and product purchase.
   * Used when user clicks "Telegram Stars" in payment dialog but hasn't linked Telegram yet.
   * Returns a deep link that will bind the account AND start the purchase in one step.
   */
  generateBindPayToken: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (SALES_PAUSED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "SALES_PAUSED",
        });
      }

      const userId = ctx.session.user.id;
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

      if (!botUsername) {
        throw new Error("Telegram Bot is not configured");
      }

      const token = await createBindPayToken(userId, input.productId);
      const deepLink = `https://t.me/${botUsername}?start=bp_${token}`;

      return { deepLink };
    }),

  /**
   * Unbind Telegram account.
   */
  unbind: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    await ctx.db.user.update({
      where: { id: userId },
      data: { telegramId: null },
    });

    return { success: true };
  }),
});
