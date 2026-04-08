import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import { NEW_USER_UNLOCK_OFFER } from "@/server/offers/constants";
import { UserOfferType, UserOfferState } from "@prisma/client";

export const resetNewUserOffer = adminProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const now = new Date();
    const endsAt = new Date(now.getTime() + NEW_USER_UNLOCK_OFFER.durationMs);

    const offer = await ctx.db.userOffer.upsert({
      where: {
        userId_type: {
          userId: input.userId,
          type: UserOfferType.NEW_USER_UNLOCK,
        },
      },
      create: {
        userId: input.userId,
        type: UserOfferType.NEW_USER_UNLOCK,
        state: UserOfferState.ACTIVE,
        source: "admin_reset",
        startedAt: now,
        endsAt,
      },
      update: {
        state: UserOfferState.ACTIVE,
        source: "admin_reset",
        startedAt: now,
        endsAt,
        consumedAt: null,
      },
    });

    return { success: true, offer };
  });

