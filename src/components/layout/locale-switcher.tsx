"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const currentLocale = useLocale() as Locale;

  const handleSelect = (locale: Locale) => {
    if (locale === currentLocale) return;
    setLocaleCookie(locale);
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 text-muted-foreground hover:text-foreground px-2", className)}
          aria-label="Switch language"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">
            {LOCALE_LABELS[currentLocale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
            className={cn(
              "cursor-pointer",
              locale === currentLocale && "font-medium text-foreground"
            )}
          >
            {LOCALE_LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
