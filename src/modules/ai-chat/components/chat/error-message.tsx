"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw, X, ChevronDown, ChevronUp, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ErrorMessageProps {
  error: Error;
  onRetry?: () => void;
  onNewChat?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({ error, onRetry, onNewChat, onDismiss, className }: ErrorMessageProps) {
  const t = useTranslations("aiChat");
  const [showDetails, setShowDetails] = useState(false);

  const getUserFriendlyMessage = (err: Error): string => {
    const message = err.message;

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return t("errorNetwork");
    }
    if (message.includes('timeout') || message.includes('Timeout')) {
      return t("errorTimeout");
    }
    if (message.includes('Unauthorized') || message.includes('401')) {
      return t("errorUnauthorized");
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return t("errorRateLimit");
    }
    if (message.includes('500') || message.includes('Internal Server Error')) {
      return t("errorServer");
    }
    if (message.includes('No tool schema found') || message.includes('tool part')) {
      return t("errorToolSchema");
    }
    if (message.includes('model') || message.includes('API key')) {
      return t("errorModel");
    }
    if (message.length < 100 && !message.includes('{') && !message.includes('Error:')) {
      return message;
    }

    return t("errorDefault");
  };

  const friendlyMessage = getUserFriendlyMessage(error);
  const hasDetails = error.message !== friendlyMessage;

  return (
    <div className={cn("my-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50", className)}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            {friendlyMessage}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                {t("retry")}
              </Button>
            )}

            {onNewChat && (
              <Button
                size="sm"
                variant="outline"
                onClick={onNewChat}
                className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                <MessageSquarePlus className="h-3 w-3 mr-1.5" />
                {t("newChat")}
              </Button>
            )}

            {hasDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8 text-xs text-red-700 hover:bg-red-100 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1.5" />
                    {t("hideDetails")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1.5" />
                    {t("showDetails")}
                  </>
                )}
              </Button>
            )}

            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-8 w-8 p-0 text-red-700 hover:bg-red-100 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-900/50 ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {showDetails && hasDetails && (
        <div className="border-t border-red-200 dark:border-red-900/50 bg-red-100/50 dark:bg-red-950/40 p-4">
          <p className="text-xs font-mono text-red-800 dark:text-red-300 break-all">
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
}
