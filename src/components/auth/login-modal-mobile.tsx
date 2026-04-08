"use client";

import * as React from "react";
import { 
  Mail, 
  ArrowLeft, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  X 
} from "lucide-react";
import { VibeLogo } from "@/components/ui/vibe-logo";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useLogin, TURNSTILE_SITE_KEY } from "./use-login";
import Script from "next/script";

// ============ Mobile-Specific Sub-components ============

const MobileGoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
  </svg>
);

const MobilePromotionBadge = () => null;

// Turnstile Widget Wrapper
const MobileTurnstileWidget: React.FC<{ onSuccess: (token: string) => void }> = ({ onSuccess }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = React.useState(false);

  const renderWidget = React.useCallback(() => {
    if (typeof window === "undefined" || rendered || !containerRef.current) return;
    const w = window as unknown as { turnstile?: { render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void } };
    if (!w.turnstile) return;

    w.turnstile.render(containerRef.current, {
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

  React.useEffect(() => {
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
      <div ref={containerRef} className="flex justify-center my-4" />
    </>
  );
};

export function LoginModalMobile() {
  const login = useLogin();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 仅在首次进入 Email 视图时聚焦，不干预后续行为
  React.useEffect(() => {
    if (login.view === "email" && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true }); // 尽可能不触发滚动，让浏览器自己决定
      }, 100);
    }
  }, [login.view]);

  return (
    <Drawer 
      open={login.loginModalOpen} 
      onOpenChange={login.handleModalClose}
      shouldScaleBackground
    >
      <DrawerContent className="bg-white dark:bg-slate-950 max-h-[92dvh] flex flex-col rounded-t-[20px] outline-none">
        <VisuallyHidden.Root>
          <DrawerTitle>Sign in to AI SaaS</DrawerTitle>
          <DrawerDescription>Sign in/Sign up</DrawerDescription>
        </VisuallyHidden.Root>

        {/* 顶部把手 - 也是 Drawer 默认会带的，这里不渲染自定义的了 */}

        {/* 
          主要内容区域 
          关键点：
          1. flex-1 overflow-y-auto: 允许内容滚动
          2. pb-32: 底部留出大片缓冲区，这样当键盘弹起时，浏览器有足够的空间把输入框顶上来，
             而不会因为到底了顶不动。
        */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          
          {/* ============ View 1: Main (Social Options) ============ */}
          {login.view === "main" && (
            <div className="flex flex-col items-center pt-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="mb-6 scale-110">
                <VibeLogo size="lg" />
              </div>

              <div className="text-center mb-8 space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Welcome to AI SaaS
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Build with AI SaaS in seconds
                </p>
                <div className="pt-2">
                  <MobilePromotionBadge />
                </div>
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={login.handleGoogleLogin}
                  className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-lg active:scale-[0.98] transition-transform shadow-sm"
                >
                  <MobileGoogleLogo />
                  Continue with Google
                </button>

                <div className="relative py-4 flex items-center">
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                  <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Or</span>
                  <div className="flex-grow border-t border-slate-100 dark:border-slate-800" />
                </div>

                <button
                  onClick={login.handleEmailMethodSelect}
                  className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-lg active:scale-[0.98] transition-transform"
                >
                  <Mail className="w-5 h-5" />
                  Continue with Email
                </button>
              </div>

              <p className="mt-12 text-center text-xs text-slate-400 px-4 leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {/* ============ View 2: Email Input ============ */}
          {login.view === "email" && (
            <div className="flex flex-col pt-4 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={login.handleBack}
                  className="p-2 -ml-2 text-slate-500 active:text-slate-900 dark:active:text-slate-200"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <DrawerClose className="p-2 -mr-2 text-slate-400 active:text-slate-600">
                  <X className="w-6 h-6" />
                </DrawerClose>
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {login.isPasswordMode ? "Welcome Back" : "Sign in with Email"}
              </h2>
              <p className="text-slate-500 mb-8">
                {login.isPasswordMode 
                  ? "Enter your password to verify it's you." 
                  : "We'll send a magic link to your email."}
              </p>

              <form onSubmit={login.handleFormSubmit} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                    Email
                  </label>
                  <input
                    ref={inputRef}
                    type="email"
                    value={login.email}
                    onChange={(e) => login.handleEmailChange(e.target.value)}
                    onBlur={(e) => login.handleEmailBlur(e.target.value)}
                    placeholder="name@example.com"
                    className={cn(
                      "w-full h-14 px-4 rounded-xl border bg-slate-50 dark:bg-slate-900 text-lg outline-none transition-all",
                      login.error 
                        ? "border-red-300 focus:border-red-500 bg-red-50/50" 
                        : "border-transparent focus:border-slate-300 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-950"
                    )}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                  />
                  
                  {/* Inline Autocomplete */}
                  {login.showAutocomplete && login.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {login.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault(); 
                            login.handleAutocompleteSuggestionClick(suggestion);
                          }}
                          className="flex items-center gap-2 px-4 py-3 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 active:bg-slate-200 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-base text-slate-700 dark:text-slate-200">
                            {suggestion.split("@")[0]}
                            <span className="text-slate-400">@{suggestion.split("@")[1]}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                {login.isPasswordMode && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={login.showPassword ? "text" : "password"}
                        value={login.password}
                        onChange={(e) => {
                          login.setPassword(e.target.value);
                          login.setError(null);
                        }}
                        className={cn(
                          "w-full h-14 px-4 pr-12 rounded-xl border bg-slate-50 dark:bg-slate-900 text-lg outline-none transition-all",
                          login.error ? "border-red-300" : "border-transparent focus:border-slate-300 focus:bg-white dark:focus:bg-slate-950"
                        )}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => login.setShowPassword(!login.showPassword)}
                        className="absolute right-0 top-0 h-full px-4 text-slate-400"
                      >
                        {login.showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Turnstile */}
                {TURNSTILE_SITE_KEY &&
                  !login.isPasswordMode &&
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email.trim()) && (
                    <MobileTurnstileWidget onSuccess={login.setTurnstileToken} />
                )}

                {/* Error Message */}
                {login.error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-1">
                    <div className="w-1 h-1 rounded-full bg-current" />
                    {login.error}
                  </div>
                )}

                {/* Submit Button - Flow Layout (Not fixed) */}
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={login.isLoading || !login.email || (login.isPasswordMode && !login.password)}
                    className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-bold shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {login.isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {login.isPasswordMode ? "Signing in..." : "Sending Link..."}
                      </>
                    ) : (
                      login.isPasswordMode ? "Sign In" : "Send Magic Link"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============ View 3: Success ============ */}
          {login.view === "email-sent" && (
            <div className="flex flex-col items-center justify-center pt-10 pb-10 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h2 className="text-2xl font-bold mb-3 text-center">Check your inbox</h2>
              <p className="text-center text-slate-500 mb-8 max-w-[280px]">
                We sent a login link to <br/>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{login.email}</span>
              </p>

              <div className="w-full space-y-4">
                {login.getEmailProvider(login.email) && (
                  <button
                    onClick={() => window.open(login.getEmailProvider(login.email)?.url, "_blank")}
                    className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
                  >
                    Open {login.getEmailProvider(login.email)?.name}
                  </button>
                )}
                
                <button
                  onClick={login.handleUseDifferentEmail}
                  className="w-full py-4 text-sm font-semibold text-slate-500 active:text-slate-900 dark:active:text-slate-200"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
