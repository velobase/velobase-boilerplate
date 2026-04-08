/* eslint-disable @next/next/no-img-element */
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Link as LinkIcon,
} from "lucide-react"
import Link from "next/link"
import type { RelatedUser } from "./types"

interface UserRelatedUsersCardProps {
  deviceKeyAtSignup: string | null
  relatedUsers: RelatedUser[] | undefined
  isLoading: boolean
}

export function UserRelatedUsersCard({ deviceKeyAtSignup, relatedUsers, isLoading }: UserRelatedUsersCardProps) {
  if (!deviceKeyAtSignup) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Related Users (Same Device)
        </CardTitle>
        <CardDescription>
          Other accounts registered with the same device key
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !relatedUsers || relatedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No other accounts found with this device
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedUsers.map((relUser) => (
                <TableRow key={relUser.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {relUser.image ? (
                        <img src={relUser.image} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{relUser.name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{relUser.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {relUser.isBlocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {relUser.isPrimaryDeviceAccount ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(relUser.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/users/${relUser.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

