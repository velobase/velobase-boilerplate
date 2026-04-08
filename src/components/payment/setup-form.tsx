"use client";

import React, { useState, useEffect } from "react";
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, CreditCard, ShieldCheck } from "lucide-react";
import type { StripeCardNumberElementOptions } from "@stripe/stripe-js";
import { useTheme } from "next-themes";

// Common countries
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
];

const LIGHT_STYLE: StripeCardNumberElementOptions["style"] = {
  base: {
    fontSize: "14px",
    color: "#18181b", // Zinc-950 (Black)
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontWeight: "400",
    "::placeholder": { color: "#a1a1aa" }, // Zinc-400
    iconColor: "#71717a", // Zinc-500
  },
  invalid: { color: "#ef4444", iconColor: "#ef4444" },
};

const DARK_STYLE: StripeCardNumberElementOptions["style"] = {
  base: {
    fontSize: "14px",
    color: "#ffffff",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontWeight: "400",
    "::placeholder": { color: "#71717a" }, // Zinc-500
    iconColor: "#ffffff",
  },
  invalid: { color: "#ef4444", iconColor: "#ef4444" },
};

const INPUT_WRAPPER_CLASS = 
  "flex h-11 w-full rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm transition-all " +
  "hover:border-zinc-300 dark:hover:border-white/20 " +
  "focus-within:border-black dark:focus-within:border-white focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white items-center";

interface SetupFormProps {
  clientSecret: string;
}

export function SetupForm({ clientSecret }: SetupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { theme, systemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(undefined);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [country, setCountry] = useState("US");
  const [postalCode, setPostalCode] = useState("");

  // Handle hydration mismatch
  useEffect(() => {
    setCurrentTheme(theme === 'system' ? systemTheme : theme);
  }, [theme, systemTheme]);

  // Determine current stripe style
  const stripeStyle = currentTheme === "dark" ? DARK_STYLE : LIGHT_STYLE;
  
  // Dynamic Input Style options
  const inputOptions = {
    style: stripeStyle,
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    if (!name.trim()) {
      setErrorMessage("Please enter the cardholder name.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: name.trim(),
          address: { country, postal_code: postalCode.trim() || undefined },
        },
      },
      return_url: `${window.location.origin}/payment-info/success`,
    });

    if (error) {
      setErrorMessage(error.message ?? "An unexpected error occurred.");
      setLoading(false);
    } else {
      toast.success("Payment method setup successfully!");
    }
  };

  if (!currentTheme) return null; // Prevent flash of unstyled content

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-xl dark:shadow-black/40 dark:backdrop-blur-sm transition-colors duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Payment Details</h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-white/5 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-white/5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>Secure Encrypted</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cardholder-name" className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold pl-1">Name on card</Label>
            <Input
              id="cardholder-name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 focus:border-black dark:focus:border-white focus:ring-black/10 dark:focus:ring-white/20"
            />
          </div>

          {/* Card Number */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold pl-1">Card Number</Label>
            <div className={INPUT_WRAPPER_CLASS}>
              <CardNumberElement options={{...inputOptions, showIcon: true}} className="w-full" />
            </div>
          </div>

          {/* Expiry & CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold pl-1">Expiry</Label>
              <div className={INPUT_WRAPPER_CLASS}>
                <CardExpiryElement options={inputOptions} className="w-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold pl-1">CVC</Label>
              <div className={INPUT_WRAPPER_CLASS}>
                <CardCvcElement options={inputOptions} className="w-full" />
              </div>
            </div>
          </div>

          {/* Country & Zip */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold pl-1">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-11 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-indigo-500/10 dark:focus:ring-orange-500/20">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold pl-1">Postal Code</Label>
              <Input
                placeholder="e.g. 10001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-11 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-indigo-500 dark:focus:border-orange-500 focus:ring-indigo-500/10 dark:focus:ring-orange-500/20"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
          <Button 
            type="submit" 
            disabled={!stripe || loading} 
            className="w-full h-11 text-sm font-medium transition-all shadow-lg hover:shadow-xl dark:shadow-white/5 bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            size="lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 opacity-70" />
                Save Payment Method
              </span>
            )}
          </Button>
          
          <div className="flex justify-center items-center gap-4 mt-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             <CreditCard className="w-5 h-5 text-slate-400 dark:text-slate-500" />
             <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500">STRIPE SECURE</span>
          </div>
        </div>
      </div>
    </form>
  );
}
