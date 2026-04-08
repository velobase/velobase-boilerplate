import { protectedProcedure } from "@/server/api/trpc";
import { getSavedCardInfo } from "@/server/order/services/stripe/charge-saved-card";

/**
 * 检查当前用户是否有保存的支付卡
 * 返回卡信息（last4, brand 等）用于前端展示
 */
export const hasSavedCardProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const cardInfo = await getSavedCardInfo(userId);
    return cardInfo;
  }
);

