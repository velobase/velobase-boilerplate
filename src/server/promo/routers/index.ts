import { protectedProcedure, createTRPCRouter } from '@/server/api/trpc'
import { validateCodeSchema, redeemCodeSchema } from '../schemas'
import { validateCode } from '../services/validate'
import { redeemCode } from '../services/redeem'

export const promoRouter = createTRPCRouter({
  validate: protectedProcedure
    .input(validateCodeSchema)
    .mutation(async ({ ctx, input }) => validateCode({ ...input, userId: ctx.session.user.id })),

  redeem: protectedProcedure
    .input(redeemCodeSchema)
    .mutation(async ({ ctx, input }) => redeemCode({ ...input, userId: ctx.session.user.id })),
})



