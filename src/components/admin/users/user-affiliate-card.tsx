"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  Wallet,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import type { UserDetailData } from "./types"

interface UserAffiliateCardProps {
  user: UserDetailData
}

export function UserAffiliateCard({ user }: UserAffiliateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Affiliate / Referral
        </CardTitle>
        <CardDescription>
          {user.affiliate.affiliateEnabledAt
            ? `Enabled at ${new Date(user.affiliate.affiliateEnabledAt).toLocaleString("zh-CN")}`
            : "Not activated"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Referral Code</p>
            <p className="font-mono">{user.affiliate.referralCode || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Referrals</p>
            <p className="font-medium">{user.affiliate.referralsCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Referred By</p>
            {user.affiliate.referredBy ? (
              <Link
                href={`/admin/users/${user.affiliate.referredBy.id}`}
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {user.affiliate.referredBy.email || user.affiliate.referredBy.name || "Unknown"}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <p>-</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Payout Wallet</p>
            <p className="font-mono text-xs truncate">{user.affiliate.payoutWallet || "-"}</p>
          </div>
        </div>

        <Separator />

        {/* Affiliate Wallet Balances */}
        <div>
          <p className="text-sm font-medium mb-2">Affiliate Wallet</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-lg font-bold text-amber-600">
                ${(user.affiliate.balances.pendingCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </p>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                ${(user.affiliate.balances.availableCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Wallet className="h-3 w-3" />
                Available
              </p>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-lg font-bold text-blue-600">
                ${(user.affiliate.balances.lockedCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Locked
              </p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold text-muted-foreground">
                ${(user.affiliate.balances.debtCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Debt</p>
            </div>
          </div>
        </div>

        {/* Recent Payout Requests */}
        {user.affiliate.payoutRequests.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Recent Payout Requests</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.affiliate.payoutRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {req.type === "CASHOUT_USDT" ? "USDT" : "Credits"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${(req.amountCents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "COMPLETED"
                              ? "default"
                              : req.status === "REJECTED" || req.status === "FAILED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-32 truncate">
                        {req.walletAddress || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(req.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

