"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CONSENT_COOKIE = "app_cookie_consent";
const CONSENT_AT_COOKIE = "app_cookie_consent_at";

type ConsentValue = "all" | "necessary";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const regex = new RegExp(
    `(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`,
  );
  const match = regex.exec(document.cookie);
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? ";Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

function deleteNonEssentialCookiesBestEffort() {
  // Marketing / analytics cookies used in this codebase.
  const names = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_first_visit",
    "visitor_id",
    "propeller_visitor_id",
    "aclid",
    "gclid",
    "wbraid",
    "gbraid",
    "app_ref",
    "app_landing_path",
    "app_ref_host",
    "app_first_touch_at",
  ];
  for (const n of names) deleteCookie(n);
}

export function CookieBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // We need to wait for mount to access document/localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  const isEea = useMemo(() => {
    // Provided by server in <html data-eea="1|0">.
    if (typeof document === "undefined") return false;
    // For "fake" / demo purposes, or if the user removed the data attribute,
    // we can default to true to ensure the UI is visible for testing if implied.
    // However, adhering to the codebase, we check the dataset.
    // If you want to force show it for testing, change this to true.
    return document.documentElement.dataset.eea === "1";
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // If not EEA, we usually don't show, but if the user wants "fake" / explicit control
    // they might want it always. For now, I'll respect the EEA flag but if it's "fake" maybe they want it always?
    // Let's stick to the flag but make it easy to enable.
    if (!isEea) return;

    const existing = getCookie(CONSENT_COOKIE);
    if (!existing) setVisible(true);
  }, [isEea, mounted]);

  const save = (value: ConsentValue) => {
    setCookie(CONSENT_COOKIE, value, 180);
    setCookie(CONSENT_AT_COOKIE, new Date().toISOString(), 180);
    if (value === "necessary") {
      deleteNonEssentialCookiesBestEffort();
    }
    // No reload!
    setVisible(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 left-4 z-[100] w-full max-w-sm sm:bottom-6 sm:left-6"
        >
          <Card className="border-border/40 shadow-xl backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cookie className="h-5 w-5 text-primary" />
                  Cookie Settings
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setVisible(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="mt-1.5 text-xs text-muted-foreground">
                We use cookies to improve your experience. By using our site, you
                agree to our use of cookies.{" "}
                <a
                  href="/privacy"
                  className="underline transition-colors hover:text-primary"
                >
                  Privacy Policy
                </a>
                .
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2 pt-0 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => save("necessary")}
                className="w-full text-xs sm:w-auto"
              >
                Necessary Only
              </Button>
              <Button
                size="sm"
                onClick={() => save("all")}
                className="w-full text-xs sm:w-auto"
              >
                Accept All
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
