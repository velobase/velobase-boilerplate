import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/server/touch/services/utils";
import { auth } from "@/server/auth";
import { getStripeClient } from "@/server/order/providers/stripe";
import { getOrCreateStripeCustomer } from "@/server/order/services/stripe-customer";

export async function GET() {
  const baseUrl = getAppBaseUrl();
  const session = await auth();

  if (!session?.user?.id) {
    // Use absolute URL to avoid internal k8s hostnames in redirects.
    return NextResponse.redirect(
      `${baseUrl}/api/auth/signin?callbackUrl=${encodeURIComponent(
        "/account/manage-subscription",
      )}`,
    );
  }

  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(session.user.id);
    const stripe = getStripeClient();

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/account/billing`,
    });

    return NextResponse.redirect(portal.url);
  } catch {
    // Fail safe: send the user back to billing so they can still contact support / retry.
    return NextResponse.redirect(`${baseUrl}/account/billing?portal=error`);
  }
}
