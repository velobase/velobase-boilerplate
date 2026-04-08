import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PaymentSuccessClient } from "./success-client";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string; paymentId?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  if (!session) {
    const search = new URLSearchParams();
    search.set("signin", "1");
    search.set("next", `/payment/success${params?.orderId || params?.paymentId ? `?${new URLSearchParams({ ...(params?.orderId ? { orderId: params.orderId } : {}), ...(params?.paymentId ? { paymentId: params.paymentId } : {}) }).toString()}` : ""}`);
    redirect(`/?${search.toString()}`);
  }

  return (
    <Suspense>
      <PaymentSuccessClient />
    </Suspense>
  );
}


