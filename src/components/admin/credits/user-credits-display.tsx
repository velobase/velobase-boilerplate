"use client"

import { api } from "@/trpc/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { User, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { GrantCreditsDialog } from "./grant-credits-dialog"
import { DeductCreditsDialog } from "./deduct-credits-dialog"
import { OperationIcon, OperationBadge } from "./operation-status"
import { cn } from "@/lib/utils"

interface UserCreditsDisplayProps {
  userId: string
  userName: string | null
  className?: string
}

export function UserCreditsDisplay({ userId, userName, className }: UserCreditsDisplayProps) {
  const { data, isLoading, refetch } = api.admin.getUserCredits.useQuery({ userId })
  
  // Grants query with pagination
  const grantsQuery = api.admin.listBillingRecords.useInfiniteQuery(
    { userId, operationType: "GRANT", limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  )

  // Consumption query with pagination
  const consumptionQuery = api.admin.listBillingRecords.useInfiniteQuery(
    { userId, operationTypes: ["CONSUME", "FREEZE", "UNFREEZE"], limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  )

  const grantRecords = grantsQuery.data?.pages.flatMap((p) => p.items) ?? []
  const consumeRecords = consumptionQuery.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className={cn("border rounded-lg p-6 space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{userName || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{userId}</p>
          </div>
        </div>
        <div className="flex gap-2">
        <GrantCreditsDialog userId={userId} userName={userName} onSuccess={() => refetch()} />
          <DeductCreditsDialog userId={userId} userName={userName} onSuccess={() => refetch()} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Available</p>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-green-600">{data?.totalSummary?.available ?? 0}</p>
          )}
        </div>
        <div className="p-4 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Total</p>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{data?.totalSummary?.total ?? 0}</p>
          )}
        </div>
        <div className="p-4 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Used</p>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-amber-600">{data?.totalSummary?.used ?? 0}</p>
          )}
        </div>
        <div className="p-4 rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Frozen</p>
          {isLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-blue-600">{data?.totalSummary?.frozen ?? 0}</p>
          )}
        </div>
      </div>

      {data?.accounts && data.accounts.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Account Breakdown</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.accounts.map((account, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{account.subAccountType}</TableCell>
                  <TableCell className="text-right">{account.available}</TableCell>
                  <TableCell className="text-right">{account.total}</TableCell>
                  <TableCell className="text-right">{account.used}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {account.expiresAt ? new Date(account.expiresAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Tabs defaultValue="grants" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grants" className="gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Grants ({grantRecords.length}{grantsQuery.hasNextPage ? "+" : ""})
          </TabsTrigger>
          <TabsTrigger value="consumption" className="gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Consumption ({consumeRecords.length}{consumptionQuery.hasNextPage ? "+" : ""})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grants" className="mt-4">
          {grantsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : grantRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No grant records</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grantRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.subAccountType}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        +{record.amount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {record.description || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(record.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {grantsQuery.hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => grantsQuery.fetchNextPage()}
                    disabled={grantsQuery.isFetchingNextPage}
                  >
                    {grantsQuery.isFetchingNextPage ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="consumption" className="mt-4">
          {consumptionQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : consumeRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No consumption records</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <OperationIcon type={record.operationType} />
                          <OperationBadge type={record.operationType} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        -{record.amount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{record.subAccountType}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {record.description || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(record.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {consumptionQuery.hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => consumptionQuery.fetchNextPage()}
                    disabled={consumptionQuery.isFetchingNextPage}
                  >
                    {consumptionQuery.isFetchingNextPage ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
