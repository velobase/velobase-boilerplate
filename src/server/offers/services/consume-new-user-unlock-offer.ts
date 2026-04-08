import { db } from '@/server/db'
import { UserOfferState, UserOfferType } from '@prisma/client'

export async function consumeNewUserUnlockOffer({
  userId,
  consumedAt = new Date(),
}: {
  userId: string
  consumedAt?: Date
}) {
  await db.userOffer.updateMany({
    where: {
      userId,
      type: UserOfferType.NEW_USER_UNLOCK,
      state: { in: [UserOfferState.ACTIVE, UserOfferState.EXPIRED, UserOfferState.INELIGIBLE] },
    },
    data: {
      state: UserOfferState.CONSUMED,
      consumedAt,
    },
  })
}


