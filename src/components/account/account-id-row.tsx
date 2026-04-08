"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountIdRowProps {
  accountId: string;
}

/**
 * Account ID Row Component
 * Clean, minimal design - just-in-place feedback
 */
export function AccountIdRow({ accountId }: AccountIdRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      
      // Reset after 1.5 seconds
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail - user can try again
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">Account ID</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono break-all max-w-[240px] sm:max-w-none text-right">
            {accountId}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 transition-colors",
              copied && "text-green-600"
            )}
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy account ID"}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {copied && (
        <p className="text-xs text-green-600 animate-in fade-in duration-200 text-right">
          Copied ✓
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Use when contacting support
      </p>
    </div>
  );
}
