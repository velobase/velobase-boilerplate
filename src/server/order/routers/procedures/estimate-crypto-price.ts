import { z } from "zod";
import { publicProcedure } from "@/server/api/trpc";
import { env } from "@/server/shared/env";
import { estimateNowPaymentsPrice } from "../../providers/nowpayments";

const estimateSchema = z.object({
  amount: z.number().min(0.01), // USD amount
  currencyTo: z.string(), // Crypto currency code (e.g. 'btc', 'usdttrc20')
});

export const estimateCryptoPriceProcedure = publicProcedure
  .input(estimateSchema)
  .query(async ({ input }) => {
    const { amount, currencyTo } = input;
    
    // Fallback if no API key (dev mode without key)
    if (!env.NOWPAYMENTS_API_KEY) {
      return {
        estimatedAmount: 0,
        currencyFrom: 'usd',
        currencyTo,
        raw: null,
      };
    }

    try {
      const data = await estimateNowPaymentsPrice({
        amount,
        currencyFrom: 'usd',
        currencyTo,
      });

      // Ensure estimated_amount is a number (API might return string)
      const estimatedAmount = typeof data.estimated_amount === 'number' 
        ? data.estimated_amount 
        : parseFloat(String(data.estimated_amount)) || 0;

      return {
        estimatedAmount,
        currencyFrom: data.currency_from,
        currencyTo: data.currency_to,
        raw: data,
      };

    } catch (error) {
      console.error("Failed to fetch crypto estimate:", error);
      return null;
    }
  });

