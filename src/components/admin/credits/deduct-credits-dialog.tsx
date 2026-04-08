"use client"

import { useState } from "react"
import { api } from "@/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DeductCreditsDialogProps {
  userId: string
  userName: string | null
  onSuccess?: () => void
}

export function DeductCreditsDialog({ userId, userName, onSuccess }: DeductCreditsDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  const deductMutation = api.admin.deductCredits.useMutation({
    onSuccess: () => {
      toast.success(`Successfully deducted ${amount} credits`)
      setOpen(false)
      setAmount("")
      setReason("")
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleDeduct = () => {
    const numAmount = parseInt(amount, 10)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    deductMutation.mutate({ userId, amount: numAmount, reason: reason || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Minus className="h-4 w-4 mr-1" />
          Deduct
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deduct Credits</DialogTitle>
          <DialogDescription>
            Deduct credits from {userName || userId}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g. Adjustment, Refund reversal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeduct} disabled={deductMutation.isPending}>
            {deductMutation.isPending ? "Deducting..." : "Deduct Credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

