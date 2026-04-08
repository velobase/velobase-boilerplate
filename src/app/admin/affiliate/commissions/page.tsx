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
import { Loader2, Search, AlertCircle, CheckCircle2, Clock, XCircle, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AffiliateCommissionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = api.admin.listAffiliateCommissions.useQuery({
    page,
    pageSize: 20,
    search: debouncedSearch,
    status: status as "all" | "PENDING" | "AVAILABLE" | "VOIDED",
  });

  const updateStatusMutation = api.admin.updateAffiliateCommissionStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleUpdateStatus = (id: string, newStatus: "VOIDED" | "AVAILABLE" | "PENDING") => {
    if (confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Affiliate Commissions</h1>
          <p className="text-muted-foreground">Monitor and manage all affiliate earnings.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="VOIDED">Voided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Referrer</TableHead>
              <TableHead>Referred User</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
                  No commissions found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
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
                    <Link 
                      href={`/admin/users/${item.referredUserId}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {item.referredUser.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="uppercase font-mono">{item.sourceType.replace('_', ' ')}</span>
                      <span className="text-muted-foreground font-mono truncate max-w-[120px]" title={item.sourceExternalId}>
                        {item.sourceExternalId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">
                      <span className="font-bold text-green-600">
                        +${(item.commissionCents / 100).toFixed(2)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        on ${(item.grossAmountCents / 100).toFixed(2)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.state} availableAt={item.availableAt} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.state !== "VOIDED" && (
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleUpdateStatus(item.id, "VOIDED")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Void Earning
                          </DropdownMenuItem>
                        )}
                        {item.state === "VOIDED" && (
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(item.id, "AVAILABLE")}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Restore to Available
                          </DropdownMenuItem>
                        )}
                        {item.state === "PENDING" && (
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(item.id, "AVAILABLE")}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Force Mature
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

function StatusBadge({ status, availableAt }: { status: string; availableAt: Date }) {
  const config = {
    PENDING: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
    AVAILABLE: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    VOIDED: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  }[status] || { color: "bg-gray-100 text-gray-800", icon: AlertCircle };

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="outline" className={`${config.color} gap-1 pr-2`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
      {status === "PENDING" && (
        <span className="text-[10px] text-muted-foreground">
          Unlocks {format(new Date(availableAt), "MMM d")}
        </span>
      )}
    </div>
  );
}
