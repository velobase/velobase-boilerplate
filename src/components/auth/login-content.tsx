"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Script from "next/script";
import { Mail, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { VibeLogo } from "@/components/ui/vibe-logo";
import { cn } from "@/lib/utils";
import {
  useLogin,
  TURNSTILE_SITE_KEY,
} from "./use-login";
import { OAUTH_PROVIDERS } from "./oauth-providers";
import { useTranslations } from "next-intl";

// ============ Sub-components ============

const PromotionBadge = () => null;

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onSuccess }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState(false);

  const renderWidget = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!(window as unknown as { turnstile?: { render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void } }).turnstile) return;
    if (!containerRef.current) return;
    if (rendered) return;

    (window as unknown as { turnstile: { render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void } }).turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY ?? "",
      callback: (token: string) => {
        onSuccess(token);
        if (typeof document !== "undefined") {
          document.cookie = `cf_turnstile_token=${token}; path=/; max-age=600`;
        }
      },
    });
    setRendered(true);
  }, [rendered, onSuccess]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
        onLoad={renderWidget}
      />
      <div ref={containerRef} className="mt-2" />
    </>
  );
};

// ============ Views ============

interface LoginContentProps {
  TitleComponent?: React.ComponentType<{ className?: string; children: React.ReactNode }>;
  DescriptionComponent?: React.ComponentType<{ className?: string; children: React.ReactNode }>;
}

export function LoginContent({ TitleComponent, DescriptionComponent }: LoginContentProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const login = useLogin();

  const Title = TitleComponent ?? (({ className, children }: { className?: string; children: React.ReactNode }) => (
    <h2 className={className}>{children}</h2>
  ));
  const Description = DescriptionComponent ?? (({ className, children }: { className?: string; children: React.ReactNode }) => (
    <p className={className}>{children}</p>
  ));

  // ============ Main View ============
  if (login.view === "main") {
    return (
      <div className="flex flex-col items-center p-8 pt-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-6 scale-110">
          <VibeLogo size="lg" />
        </div>

        <div className="mb-8 flex flex-col items-center gap-2">
          <Title className="text-2xl font-bold tracking-tight text-center">
            {t("welcomeTitle")}
          </Title>
          <Description className="text-center text-base text-muted-foreground">
            {t("welcomeSubtitle")}
          </Description>
          <div className="mt-2">
            <PromotionBadge />
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {OAUTH_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => login.handleOAuthLogin(provider.id)}
              className="relative w-full h-12 px-4 flex items-center justify-center gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 text-[15px] font-medium text-slate-700 dark:text-slate-200 group shadow-sm"
            >
              {provider.logo}
              <span>{t("continueWith", { provider: provider.name })}</span>
            </button>
          ))}

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800/60" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-medium text-slate-400 bg-white dark:bg-slate-950 px-3">
              {t("or")}
            </div>
          </div>

          <button
            onClick={login.handleEmailMethodSelect}
            className="w-full h-12 px-4 flex items-center justify-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 text-[15px] font-medium text-slate-600 dark:text-slate-300"
          >
            <Mail className="w-[18px] h-[18px]" />
            <span>{t("continueWithEmail")}</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-8 px-6">
          {t("termsAgreement")}
        </p>
      </div>
    );
  }

  // ============ Email View ============
  if (login.view === "email") {
    return (
      <div className="p-8 pt-6 animate-in slide-in-from-right-8 fade-in duration-300">
        <button
          onClick={login.handleBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors mb-6 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {tCommon("back")}
        </button>

        <div className="mb-8">
          <Title className="text-xl font-bold mb-2">
            {t("signInWithEmail")}
          </Title>
          <Description className="text-base text-muted-foreground">
            {login.isPasswordMode
              ? t("enterPasswordDesc")
              : t("magicLinkDesc")}
          </Description>
        </div>

        <form onSubmit={login.handleFormSubmit} className="space-y-4 relative">
          <div className="space-y-1.5 relative">
            <label htmlFor="email" className="text-xs font-medium text-slate-500 uppercase tracking-wider ml-1">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              value={login.email}
              onChange={(e) => login.handleEmailChange(e.target.value)}
              onBlur={(e) => login.handleEmailBlur(e.target.value)}
              onKeyDown={login.handleAutocompleteKeyDown}
              placeholder={t("emailPlaceholder")}
              className={cn(
                "w-full h-12 px-4 rounded-xl border bg-white dark:bg-slate-900 text-[16px] transition-all duration-200 outline-none",
                login.error
                  ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-900 placeholder:text-red-300"
                  : "border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              )}
              disabled={login.isLoading}
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
            />

            {login.showAutocomplete && login.suggestions.length > 0 && (
              <div
                ref={login.autocompleteRef}
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden max-h-[240px] overflow-y-auto"
              >
                {login.suggestions.map((suggestion, idx) => (
                  <div
                    key={suggestion}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      login.handleAutocompleteSuggestionClick(suggestion);
                    }}
                    className={cn(
                      "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2",
                      idx === login.autocompleteIndex
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                    )}
                  >
                    <span className="font-medium">{suggestion.split("@")[0]}</span>
                    <span className="text-slate-400">@{suggestion.split("@")[1]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out",
              login.isPasswordMode ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="space-y-1.5 pt-1">
              <label htmlFor="password" className="text-xs font-medium text-slate-500 uppercase tracking-wider ml-1">
                {t("passwordLabel")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={login.showPassword ? "text" : "password"}
                  value={login.password}
                  onChange={(e) => {
                    login.setPassword(e.target.value);
                    login.setError(null);
                  }}
                  placeholder={t("passwordPlaceholder")}
                  className={cn(
                    "w-full h-12 px-4 pr-12 rounded-xl border bg-white dark:bg-slate-900 text-[16px] transition-all duration-200 outline-none",
                    login.error
                      ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-900 placeholder:text-red-300"
                      : "border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  )}
                  disabled={login.isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => login.setShowPassword(!login.showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {login.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {TURNSTILE_SITE_KEY &&
            !login.isPasswordMode &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email.trim()) && (
              <div className="mt-2">
                <TurnstileWidget onSuccess={login.setTurnstileToken} />
              </div>
            )}

          {login.error && (
            <p className="text-sm font-medium text-red-500 ml-1 animate-in slide-in-from-top-1 fade-in">{login.error}</p>
          )}

          <button
            type="submit"
            disabled={login.isLoading || !login.email || (login.isPasswordMode && !login.password)}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[15px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 dark:shadow-none"
          >
            {login.isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {login.isPasswordMode ? t("signingIn") : t("sendingLink")}
              </>
            ) : (
              login.isPasswordMode ? t("login") : t("sendMagicLink")
            )}
          </button>
        </form>
      </div>
    );
  }

  // ============ Email Sent View ============
  if (login.view === "email-sent") {
    const provider = login.getEmailProvider(login.email);

    return (
      <div className="flex flex-col items-center p-8 pt-10 text-center animate-in zoom-in-95 fade-in duration-500">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400 ring-8 ring-green-50 dark:ring-green-900/10">
          <Mail className="w-10 h-10" />
        </div>

        <Title className="text-2xl font-bold mb-3">
          {t("checkInbox")}
        </Title>

        <Description className="text-base mb-8 max-w-[280px] mx-auto text-muted-foreground">
          {t.rich("magicLinkSent", {
            email: login.email,
            bold: (chunks) => <span className="font-medium text-slate-900 dark:text-slate-100">{chunks}</span>,
          })}
        </Description>

        <div className="flex flex-col gap-3 w-full">
          {provider && (
            <button
              onClick={() => window.open(provider.url, "_blank")}
              className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-[15px] hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
            >
              {t("openProvider", { provider: provider.name })}
            </button>
          )}

          <button
            onClick={login.handleUseDifferentEmail}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-2 transition-colors"
          >
            {t("useDifferentEmail")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
