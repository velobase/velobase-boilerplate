import { getStripe } from "./client";
import type { Order, Payment, Product } from "@prisma/client";
import type Stripe from "stripe";

interface CreateCheckoutSessionParams {
  order: Order;
  payment: Payment;
  product: Product;
  successUrl: string;
  cancelUrl: string;
}

export async function createStripeCheckoutSession({
  order,
  payment,
  product,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams) {
  try {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: typeof product.description === 'string' ? product.description : undefined,
            },
          unit_amount: product.price,
          ...(product.type === "SUBSCRIPTION" &&
            product.interval && {
              recurring: {
                interval: product.interval as "week" | "month" | "year",
              },
            }),
        },
        quantity: 1,
      },
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode:
        product.type === "SUBSCRIPTION" ? "subscription" : "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId: order.id,
        paymentId: payment.id,
        userId: order.userId,
        productId: product.id,
      },
    };

    const session = await getStripe().checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);
    throw new Error("Failed to create checkout session");
  }
}

