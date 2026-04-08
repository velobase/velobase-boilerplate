import { protectedProcedure } from "@/server/api/trpc";
import { getStripeClient } from "@/server/order/providers/stripe";
import { getOrCreateStripeCustomer } from "@/server/order/services/stripe-customer";

/**
 * Create a Stripe SetupIntent for saving a card for future off-session payments.
 * Used for metered/usage-based billing where we need to charge later.
 */
export const createSetupIntentProcedure = protectedProcedure.mutation(
  async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get or create Stripe Customer
    const customerId = await getOrCreateStripeCustomer(userId);

    const stripe = getStripeClient();

    // Create SetupIntent
    // usage: "off_session" means we plan to charge this card later without user present
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
    });

    return { clientSecret: setupIntent.client_secret };
  }
);

