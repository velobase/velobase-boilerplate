import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { SALES_PAUSED } from "@/config/decommission";
import { getProduct } from "@/server/product/services/get";
import { getNowPaymentsMinAmount } from "../../providers/nowpayments";

const inputSchema = z.object({
  productId: z.string().min(1),
  currency: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
});

/**
 * 获取加密货币支付预览信息
 * 
 * 返回商品信息、费率、最小限额、最小购买量等，
 * 供前端渲染选币页和滑块。
 */
export const getCryptoCheckoutPreviewProcedure = protectedProcedure
  .input(inputSchema)
  .query(async ({ input }) => {
    if (SALES_PAUSED) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "SALES_PAUSED",
      });
    }

    const { productId, currency, quantity = 1 } = input;
    const currencyId = currency.toLowerCase();

    // 1. 获取商品信息
    const product = await getProduct({ productId });
    const unitPrice = product.price; // 分

    // 2. TRON surcharge (fixed) for USDT-TRC20 to cover consolidation cost (business rule)
    // This is a pass-through of actual blockchain cost, not a processing fee markup.
    const tronSurchargeCents = currencyId === "usdttrc20" ? 900 : 0;
    const tronSurchargeLabel = tronSurchargeCents > 0 ? "TRON network fee" : null;

    // 3. 查询 NowPayments 最小限额
    let minAmountUsd = 0;
    let minAmountCrypto = 0;
    try {
      const minResult = await getNowPaymentsMinAmount(currency);
      minAmountUsd = minResult.fiat_equivalent ?? 0;
      minAmountCrypto = minResult.min_amount ?? 0;
    } catch {
      // 如果查询失败，保留为 0，后续用“安全兜底最小值”避免放行过低金额
    }

    // 4. 计算最小购买量
    // 单价(USD) = unitPrice / 100
    // 增加 5% buffer 到 minAmountUsd，直接对外展示这一安全下限。
    // IMPORTANT:
    // - NowPayments 的 min-amount 接口偶发 429/超时。
    // - 若这里把最小金额当 0，会导致低客单（例如 $4.99）不会自动提升 quantity，
    //   最终在 createCryptoInvoice 才触发 "less than minimal" 错误（线上会非常频繁）。
    // - 因此当 minAmountUsd 取不到（=0）时，使用一个保守兜底值来保证 UX 正确。
    // 
    // [2024-12-14] 业务层最低限额暂时关闭，只使用 NowPayments 实际最低限额
    // 如需恢复，取消下面注释即可：
    // const BUSINESS_MIN_USD = 9.2718;
    // const safeMinAmountUsd = Math.max(BUSINESS_MIN_USD, minAmountUsd * 1.05);
    const DEFAULT_SAFE_MIN_USD = 5.25; // 约等于 $5 的 5% buffer，避免 $4.99 触发 minimal
    const safeMinAmountUsd = minAmountUsd > 0 ? minAmountUsd * 1.05 : DEFAULT_SAFE_MIN_USD;
    
    const unitPriceUsd = unitPrice / 100;
    const tronSurchargeUsd = tronSurchargeCents / 100;
    const minQuantity =
      unitPriceUsd > 0
        ? Math.max(1, Math.ceil(Math.max(0, safeMinAmountUsd - tronSurchargeUsd) / unitPriceUsd))
        : 1;

    // 5. 计算价格明细
    const baseAmount = unitPrice * quantity; // 分
    const totalAmount = baseAmount + tronSurchargeCents; // 分

    // 6. 判断是否可下单 (使用加了 buffer 的安全下限判断)
    const totalAmountUsd = totalAmount / 100;
    const isValid = totalAmountUsd >= safeMinAmountUsd;
    const invalidReason = isValid
      ? undefined
      : `The selected coin/network requires a minimum transaction of $${safeMinAmountUsd.toFixed(2)}. Please increase quantity or choose another network (USDT/USDC recommended).`;

    // 7. 解析 interval
    const rawInterval = product.productSubscription?.plan?.interval;
    const interval =
      rawInterval === "WEEK" || rawInterval === "MONTH" || rawInterval === "YEAR"
        ? rawInterval
        : null;

    return {
      product: {
        id: product.id,
        name: product.name,
        unitPrice,
        interval,
      },
      tronSurcharge: {
        amount: tronSurchargeCents,
        label: tronSurchargeLabel,
      },
      minAmount: {
        usd: safeMinAmountUsd, // 返回给前端的是"安全下限"
        crypto: minAmountCrypto,
      },
      minQuantity: Math.max(1, minQuantity),
      priceBreakdown: {
        quantity,
        baseAmount,
        tronSurchargeAmount: tronSurchargeCents,
        tronSurchargeLabel,
        totalAmount,
      },
      isValid,
      invalidReason,
    };
  });

