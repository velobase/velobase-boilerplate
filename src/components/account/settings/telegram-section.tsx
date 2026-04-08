"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Send, ExternalLink, Unlink, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Telegram Section Component
 * Allows users to connect/disconnect their Telegram account for Stars payment.
 */
export function TelegramSection() {
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const statusQuery = api.telegram.getBindingStatus.useQuery(undefined, {
    refetchInterval: deepLink ? 5000 : false, // Poll while waiting for binding
  });

  const generateToken = api.telegram.generateBindingToken.useMutation({
    onSuccess: (data) => {
      if (data.alreadyBound) {
        toast.info("Your Telegram account is already linked.");
        return;
      }
      if (data.deepLink) {
        setDeepLink(data.deepLink);
        window.open(data.deepLink, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const unbind = api.telegram.unbind.useMutation({
    onSuccess: () => {
      setDeepLink(null);
      void statusQuery.refetch();
      toast.success("Telegram account has been unlinked.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isBound = statusQuery.data?.isBound ?? false;
  const botUsername = statusQuery.data?.botUsername;

  // If just became bound while polling, clear the deep link
  if (isBound && deepLink) {
    setDeepLink(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-5">
          Connect your Telegram account to purchase credits with Telegram Stars ⭐️
        </p>

        {isBound ? (
          /* Connected state */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Connected
              </span>
              {statusQuery.data?.telegramId && (
                <span className="text-muted-foreground">
                  (ID: {statusQuery.data.telegramId})
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {botUsername && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://t.me/${botUsername}`, "_blank")}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Open Bot
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unbind.mutate()}
                disabled={unbind.isPending}
                className="text-destructive hover:text-destructive"
              >
                {unbind.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : deepLink ? (
          /* Waiting for binding state */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for you to confirm in Telegram...
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(deepLink, "_blank")}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Open in Telegram
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeepLink(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Not connected state */
          <Button
            variant="outline"
            onClick={() => generateToken.mutate()}
            disabled={generateToken.isPending || !botUsername}
          >
            {generateToken.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Connect Telegram
          </Button>
        )}

        {!botUsername && !statusQuery.isLoading && (
          <p className="text-xs text-muted-foreground">
            Telegram payments are not yet configured for this environment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
