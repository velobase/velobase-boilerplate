import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  getAirwallexBillingCheckout,
  updateAirwallexSubscriptionPaymentSource,
} from "@/server/order/providers/airwallex";

/**
 * Callback route for Airwallex Billing Checkout (SETUP mode).
 * After user completes payment method setup, Airwallex redirects here.
 * We extract the payment_source_id from the checkout and update the subscription.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  const portalUrl = "/account/manage-subscription/airwallex";
  const origin = request.nextUrl.origin;

  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL(`/api/auth/signin?callbackUrl=${encodeURIComponent(portalUrl)}`, origin)
    );
  }

  const checkoutIdFromQuery = request.nextUrl.searchParams.get("checkout_id") ?? "";
  const checkoutId = checkoutIdFromQuery || request.cookies.get("awx_setup_checkout_id")?.value || "";
  const gatewaySubscriptionId = request.cookies.get("awx_setup_gateway_subscription_id")?.value || "";

  if (!checkoutId || !gatewaySubscriptionId) {
    return NextResponse.redirect(new URL(`${portalUrl}?setup=missing_state`, origin));
  }

  try {
    // Get checkout details from Airwallex
    const checkout = await getAirwallexBillingCheckout(checkoutId);
    if (!checkout) {
      const res = NextResponse.redirect(new URL(`${portalUrl}?setup=checkout_not_found`, origin));
      res.cookies.set("awx_setup_checkout_id", "", { path: "/", maxAge: 0 });
      res.cookies.set("awx_setup_gateway_subscription_id", "", { path: "/", maxAge: 0 });
      return res;
    }

    if (checkout.status !== "COMPLETED") {
      const res = NextResponse.redirect(new URL(`${portalUrl}?setup=${checkout.status.toLowerCase()}`, origin));
      res.cookies.set("awx_setup_checkout_id", "", { path: "/", maxAge: 0 });
      res.cookies.set("awx_setup_gateway_subscription_id", "", { path: "/", maxAge: 0 });
      return res;
    }

    const paymentSourceId = checkout.paymentSourceId;
    if (!paymentSourceId) {
      const res = NextResponse.redirect(new URL(`${portalUrl}?setup=no_payment_source`, origin));
      res.cookies.set("awx_setup_checkout_id", "", { path: "/", maxAge: 0 });
      res.cookies.set("awx_setup_gateway_subscription_id", "", { path: "/", maxAge: 0 });
      return res;
    }

    const updated = await updateAirwallexSubscriptionPaymentSource(gatewaySubscriptionId, paymentSourceId);
    const res = NextResponse.redirect(
      new URL(`${portalUrl}?setup=${updated.success ? "success" : "update_failed"}`, origin)
    );
    res.cookies.set("awx_setup_checkout_id", "", { path: "/", maxAge: 0 });
    res.cookies.set("awx_setup_gateway_subscription_id", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    const res = NextResponse.redirect(new URL(`${portalUrl}?setup=error`, origin));
    res.cookies.set("awx_setup_checkout_id", "", { path: "/", maxAge: 0 });
    res.cookies.set("awx_setup_gateway_subscription_id", "", { path: "/", maxAge: 0 });
    return res;
  }
}


