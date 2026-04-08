"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AffiliatePayoutsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<"all" | "CASHOUT_USDT" | "EXCHANGE_CREDITS">("all");
  const [status, setStatus] = useState("all");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    type: string;
    amountCents: number;
    walletAddress: string | null;
  } | null>(null);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = api.admin.listAffiliatePayoutRequests.useQuery({
    page,
    pageSize: 20,
    search: debouncedSearch,
    type,
    status: status as "all" | "REQUESTED" | "APPROVED" | "COMPLETED" | "REJECTED" | "FAILED",
  });

  const updateMutation = api.admin.updateAffiliatePayoutRequest.useMutation({
    onSuccess: () => {
      toast.success("Payout updated");
      setCompleteDialogOpen(false);
      setTxHash("");
      setSelectedRequest(null);
      void refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (request: { id: string; type: string; amountCents: number; walletAddress: string | null }, action: "APPROVE" | "REJECT" | "COMPLETE" | "FAIL") => {
    if (action === "COMPLETE") {
      if (request.type === "CASHOUT_USDT") {
        setSelectedRequest(request);
        setCompleteDialogOpen(true);
        return;
      }
    }
    
    if (confirm(`Are you sure you want to ${action} this request?`)) {
      updateMutation.mutate({ id: request.id, action });
    }
  };

  const handleCompleteSubmit = () => {
    if (!txHash) return toast.error("Transaction Hash is required");
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest.id,
      action: "COMPLETE",
      txHash,
    });
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Affiliate Payouts</h1>
          <p className="text-muted-foreground">Manage cashout requests and credit exchanges.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search request ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as "CASHOUT_USDT" | "EXCHANGE_CREDITS" | "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="CASHOUT_USDT">USDT Cashout</SelectItem>
            <SelectItem value="EXCHANGE_CREDITS">Credits Exchange</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="REQUESTED">Requested</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No payout requests found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "HH:mm")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/admin/users/${item.affiliateUserId}`}
                      className="hover:underline font-medium"
                    >
                      {item.affiliateUser.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={item.type === "CASHOUT_USDT" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                      {item.type === "CASHOUT_USDT" ? "USDT Cashout" : "Credits Exchange"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold">
                      ${(item.amountCents / 100).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.type === "CASHOUT_USDT" ? (
                      <div className="font-mono text-xs max-w-[150px] truncate" title={item.walletAddress || ""}>
                        {item.walletAddress}
                        {item.txHash && (
                          <a 
                            href={`https://polygonscan.com/tx/${item.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-blue-500 hover:underline mt-1"
                          >
                            View TX ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Internal</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "REQUESTED" && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleAction(item, "REJECT")}
                        >
                          Reject
                        </Button>
                        {item.type === "CASHOUT_USDT" ? (
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction(item, "COMPLETE")}
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleAction(item, "COMPLETE")}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Complete Cashout Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Cashout</DialogTitle>
            <DialogDescription>
              Please transfer <strong>${((selectedRequest?.amountCents ?? 0) / 100).toFixed(2)} USDT</strong> to the user&apos;s wallet on Polygon network, then enter the Transaction Hash below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-muted rounded-md mb-4 font-mono text-xs break-all select-all border">
            {selectedRequest?.walletAddress}
          </div>

          <div className="space-y-2">
            <Label htmlFor="txHash">Transaction Hash</Label>
            <Input 
              id="txHash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCompleteSubmit} disabled={!txHash || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    REQUESTED: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    APPROVED: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
    COMPLETED: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    REJECTED: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
    FAILED: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  }[status] || { color: "bg-gray-100 text-gray-800", icon: Clock };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} gap-1 pr-2`}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

