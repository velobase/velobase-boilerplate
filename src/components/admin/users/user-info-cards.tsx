/* eslint-disable @next/next/no-img-element */
"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Smartphone,
  Globe,
  CreditCard,
  CheckCircle,
  DollarSign,
  MousePointerClick,
  Mail,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import type { UserDetailData } from "./types"

interface UserInfoCardsProps {
  user: UserDetailData
}

export function UserInfoCards({ user }: UserInfoCardsProps) {
  const hasUtm = user.utmSource || user.utmMedium || user.utmCampaign

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Basic Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {user.image ? (
              <img src={user.image} alt="" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{user.name || "No name"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Canonical Email</p>
              <p className="font-mono text-xs">{user.canonicalEmail || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-mono text-xs truncate">{user.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p>{new Date(user.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device & Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Device & Security
          </CardTitle>
          <CardDescription>Anti-abuse tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Signup IP</p>
              <p className="font-mono text-xs">{user.signupIp || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Primary Account</p>
              <p>
                {user.isPrimaryDeviceAccount ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    No (Secondary)
                  </Badge>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Device Key</p>
              <p className="font-mono text-xs break-all">{user.deviceKeyAtSignup || "Not recorded"}</p>
            </div>
            {user.stripeCustomerId && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Stripe Customer</p>
                <a
                  href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {user.stripeCustomerId}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* UTM Attribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            UTM Attribution
          </CardTitle>
          <CardDescription>Where did this user come from?</CardDescription>
        </CardHeader>
        <CardContent>
          {hasUtm ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Source</p>
                <p>{user.utmSource || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Medium</p>
                <p>{user.utmMedium || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Campaign</p>
                <p>{user.utmCampaign || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Term</p>
                <p>{user.utmTerm || "-"}</p>
              </div>
              {user.utmContent && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Content</p>
                  <p>{user.utmContent}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No UTM data recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.subscription ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{user.subscription.planSnapshot.name || "Unknown Plan"}</p>
                  <p className="text-sm text-muted-foreground">{user.subscription.planSnapshot.type}</p>
                </div>
                <Badge variant={user.subscription.status === "ACTIVE" ? "default" : "secondary"}>
                  {user.subscription.status}
                </Badge>
              </div>
              {user.subscription.currentCycle && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Current Period</p>
                  <p>
                    {new Date(user.subscription.currentCycle.startsAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })} -{" "}
                    {new Date(user.subscription.currentCycle.expiresAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              )}
              {user.subscription.cancelAtPeriodEnd && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  Cancels at period end
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription</p>
          )}
        </CardContent>
      </Card>

      {/* User Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            User Stats
          </CardTitle>
          <CardDescription>Lifetime value & usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                ${((user.stats?.totalPaidCents ?? 0) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Total Paid (LTV)</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{user.stats?.ordersCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{user.stats?.generatedVideosCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Pro Trial Used</p>
              <p>{user.stats?.hasUsedProTrial ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Trial Converted</p>
              <p>{user.stats?.proTrialConverted ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Hit Paywall Count</p>
              <p className="font-medium">{user.stats?.hitPaywallCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ad Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            Ad Tracking
          </CardTitle>
          <CardDescription>Google Ads click attribution</CardDescription>
        </CardHeader>
        <CardContent>
          {user.adClickId ? (
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Click ID</p>
                <p className="font-mono text-xs break-all">{user.adClickId}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p>{user.adClickProvider || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Click Time</p>
                  <p>{user.adClickTime ? new Date(user.adClickTime).toLocaleString("zh-CN") : "-"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ad click data</p>
          )}
        </CardContent>
      </Card>

      {/* Email Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.emailBounced ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Bounced
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Not Bounced
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user.emailComplained ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Complained
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  No Complaints
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

