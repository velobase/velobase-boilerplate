import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PaymentFailedClient } from "./failed-client";

export default async function PaymentFailedPage({ searchParams }: { searchParams: Promise<{ orderId?: string; paymentId?: string; reason?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  if (!session) {
    const search = new URLSearchParams();
    search.set("signin", "1");
    search.set("next", `/payment/failed${params?.orderId || params?.paymentId || params?.reason ? `?${new URLSearchParams({ ...(params?.orderId ? { orderId: params.orderId } : {}), ...(params?.paymentId ? { paymentId: params.paymentId } : {}), ...(params?.reason ? { reason: params.reason } : {}) }).toString()}` : ""}`);
    redirect(`/?${search.toString()}`);
  }

  return (
    <Suspense>
      <PaymentFailedClient />
    </Suspense>
  );
}


