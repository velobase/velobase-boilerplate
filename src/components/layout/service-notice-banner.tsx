"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { SALES_PAUSED } from "@/config/decommission";

const DISMISS_KEY = "vv_service_notice_feb2026";

export function ServiceNoticeBanner() {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    if (!SALES_PAUSED) return;
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored !== "1") {
      setDismissed(false);
    }
  }, []);

  if (!SALES_PAUSED || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <div className="relative z-[60] w-full bg-amber-900/90 border-b border-amber-700/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-sm text-amber-100 leading-snug">
              <span className="font-semibold text-amber-300">Payment Notice</span>
              {" — "}
              Due to a payment processing issue, all credit purchases are temporarily paused
              during February 2026. Your existing credits remain fully available, and annual
              subscriptions will continue receiving monthly credits as scheduled. We will
              resume as soon as the issue is resolved.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-md p-1 text-amber-400/70 hover:text-amber-300 hover:bg-amber-800/50 transition-colors"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
