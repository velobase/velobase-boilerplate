"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CompletePayoutDialog } from "./complete-payout-dialog";

type FilterStatus = "all" | "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | "FAILED";
type FilterType = "all" | "CASHOUT_USDT" | "EXCHANGE_CREDITS";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  REQUESTED: "outline",
  APPROVED: "secondary",
  COMPLETED: "default",
  REJECTED: "destructive",
  FAILED: "destructive",
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AffiliatePayoutsTable() {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<FilterStatus>("REQUESTED");
  const [type, setType] = useState<FilterType>("CASHOUT_USDT");
  const [search, setSearch] = useState("");

  const { data, isLoading } = api.admin.listAffiliatePayoutRequests.useQuery({
    page,
    pageSize,
    status,
    type,
    search: search || undefined,
  });

  const mutate = api.admin.updateAffiliatePayoutRequest.useMutation({
    onSuccess: async () => {
      toast.success("Updated");
      await utils.admin.listAffiliatePayoutRequests.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Payouts</h1>
          <p className="text-muted-foreground">Manual cashout ops (USDT / Polygon)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search requestId/userId/email/wallet"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-80"
          />
          <Select value={type} onValueChange={(v) => { setType(v as FilterType); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASHOUT_USDT">CASHOUT_USDT</SelectItem>
              <SelectItem value="EXCHANGE_CREDITS">EXCHANGE_CREDITS</SelectItem>
              <SelectItem value="all">all</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as FilterStatus); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REQUESTED">REQUESTED</SelectItem>
              <SelectItem value="APPROVED">APPROVED</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
              <SelectItem value="all">all</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Created</TableHead>
              <TableHead className="w-[220px]">User</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead>txHash</TableHead>
              <TableHead className="text-right w-[280px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (data?.items?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  No payout requests
                </TableCell>
              </TableRow>
            ) : (
              data!.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.createdAt).toLocaleString("zh-CN")}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{r.affiliateUser.email ?? r.affiliateUserId}</div>
                    <div className="text-muted-foreground">{r.affiliateUserId}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.type}</TableCell>
                  <TableCell className="font-semibold">{formatUsd(r.amountCents)}</TableCell>
                  <TableCell className="font-mono text-xs break-all">{r.walletAddress ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status] ?? "outline"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs break-all">{r.txHash ?? "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {(r.status === "REQUESTED" || r.status === "APPROVED") && (
                      <>
                        {r.status === "REQUESTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => mutate.mutate({ id: r.id, action: "APPROVE" })}
                            disabled={mutate.isPending}
                          >
                            Approve
                          </Button>
                        )}
                        <CompletePayoutDialog
                          requestId={r.id}
                          type={r.type}
                          defaultTxHash={r.txHash}
                          onSuccess={() => utils.admin.listAffiliatePayoutRequests.invalidate()}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => mutate.mutate({ id: r.id, action: "FAIL" })}
                          disabled={mutate.isPending}
                        >
                          Fail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => mutate.mutate({ id: r.id, action: "REJECT" })}
                          disabled={mutate.isPending}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}



