import { Suspense } from "react";
import { UnsubscribeClient } from "./unsubscribe-client";

export const metadata = {
  title: "Unsubscribe | AI SaaS",
  description: "Manage your email preferences",
};

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeLoading />}>
      <UnsubscribeClient />
    </Suspense>
  );
}

function UnsubscribeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

