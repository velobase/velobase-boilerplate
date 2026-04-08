import type Stripe from "stripe";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function processStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object
      );
      break;

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object
      );
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(
        event.data.object
      );
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(
        event.data.object
      );
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object
      );
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object
      );
      break;

    default:
      // Unhandled event type
      break;
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const { orderId, paymentId } = session.metadata ?? {};

  if (!orderId || !paymentId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const payment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "SUCCEEDED",
      gatewayTransactionId: session.payment_intent as string,
      gatewaySubscriptionId: session.subscription as string | undefined,
      gatewayResponse: JSON.parse(JSON.stringify(session)) as Prisma.InputJsonValue,
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "FULFILLED",
    },
  });

  // Mark user as having purchased (for free video IP limit bypass)
  await db.user.update({
    where: { id: payment.userId },
    data: { hasPurchased: true },
  });
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const payment = await db.payment.findFirst({
    where: {
      gatewayTransactionId: paymentIntent.id,
    },
  });

  if (!payment) {
    console.error("Payment not found for payment intent:", paymentIntent.id);
    return;
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCEEDED",
      gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)) as Prisma.InputJsonValue,
    },
  });

  await db.order.update({
    where: { id: payment.orderId },
    data: {
      status: "FULFILLED",
    },
  });
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const payment = await db.payment.findFirst({
    where: {
      gatewayTransactionId: paymentIntent.id,
    },
  });

  if (!payment) {
    console.error("Payment not found for payment intent:", paymentIntent.id);
    return;
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)) as Prisma.InputJsonValue,
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const { orderId, paymentId } = invoice.metadata ?? {};

  if (!orderId || !paymentId) {
    console.error("Missing metadata in invoice");
    return;
  }

  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "SUCCEEDED",
      gatewayResponse: JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonValue,
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "FULFILLED",
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const payment = await db.payment.findFirst({
    where: {
      gatewaySubscriptionId: subscription.id,
    },
  });

  if (!payment) {
    console.error("Payment not found for subscription:", subscription.id);
    return;
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      gatewayResponse: JSON.parse(JSON.stringify(subscription)) as Prisma.InputJsonValue,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const payment = await db.payment.findFirst({
    where: {
      gatewaySubscriptionId: subscription.id,
    },
  });

  if (!payment) {
    console.error("Payment not found for subscription:", subscription.id);
    return;
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "EXPIRED",
      gatewayResponse: JSON.parse(JSON.stringify(subscription)) as Prisma.InputJsonValue,
    },
  });

  await db.order.update({
    where: { id: payment.orderId },
    data: {
      status: "EXPIRED",
    },
  });
}

