"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

/**
 * Privacy Section Component
 * Simple privacy policy link - following "less is more" principle
 */
export function PrivacySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Security</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Privacy Policy</label>
            <p className="text-sm text-muted-foreground mt-1">
              Learn how we handle your data
            </p>
          </div>
          <Link 
            href="/privacy" 
            target="_blank"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
