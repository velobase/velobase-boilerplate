"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeSelect } from "@/components/theme-toggle";
import { TimezoneSelect } from "@/components/account/timezone-select";
import { CountryDisplay } from "@/components/account/country-display";
import { PaymentPreferenceSelect } from "./payment-preference-select";

/**
 * Preferences Section Component
 * Manages user preferences like theme and timezone
 * Both settings auto-save on change with toast feedback
 */
export function PreferencesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium leading-5">Theme</label>
            <p className="text-sm text-muted-foreground mt-0.5 leading-5">
              Choose your interface appearance
            </p>
          </div>
          <ThemeSelect />
        </div>

        {/* Timezone Selection */}
        <div className="border-t pt-6">
          <div className="flex-1 mb-3">
            <label className="text-sm font-medium leading-5">Timezone</label>
            <p className="text-sm text-muted-foreground mt-0.5 leading-5">
              Set your local timezone for daily rewards
            </p>
          </div>
          <TimezoneSelect />
        </div>

        {/* Country/Region Display (Read-only) */}
        <div className="border-t pt-6">
          <div className="flex-1 mb-3">
            <label className="text-sm font-medium leading-5">Country/Region</label>
            <p className="text-sm text-muted-foreground mt-0.5 leading-5">
              Auto-detected for payment and tax purposes
            </p>
          </div>
          <CountryDisplay />
        </div>

        {/* Payment Preference */}
        <div className="border-t pt-6">
          <div className="flex-1 mb-3">
            <label className="text-sm font-medium leading-5">Payment Method</label>
            <p className="text-sm text-muted-foreground mt-0.5 leading-5">
              Choose your default payment method for purchases
            </p>
          </div>
          <PaymentPreferenceSelect />
        </div>
      </CardContent>
    </Card>
  );
}
