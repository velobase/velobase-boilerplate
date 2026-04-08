"use client"

import { api } from "@/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Shield,
  ShieldOff,
  Smartphone,
  CreditCard,
  Coins,
  Ban,
  CheckCircle,
  Trash2,
  Film,
  ShoppingCart,
  Timer,
  Eye,
  EyeOff,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { UserDetailData } from "./types"

interface UserActionsToolbarProps {
  user: UserDetailData
}

export function UserActionsToolbar({ user }: UserActionsToolbarProps) {
  const router = useRouter()
  const utils = api.useUtils()

  const blockMutation = api.admin.blockUser.useMutation({
    onSuccess: () => {
      void utils.admin.getUser.invalidate({ userId: user.id })
      router.refresh()
    },
  })

  const unblockMutation = api.admin.unblockUser.useMutation({
    onSuccess: () => {
      void utils.admin.getUser.invalidate({ userId: user.id })
      router.refresh()
    },
  })

  const deleteMutation = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      router.push("/admin/users")
    },
  })

  const resetOfferMutation = api.admin.resetNewUserOffer.useMutation({
    onSuccess: () => {
      void utils.admin.getUser.invalidate({ userId: user.id })
      router.refresh()
    },
  })

  const setBlurBypassMutation = api.admin.setBlurBypass.useMutation({
    onSuccess: () => {
      void utils.admin.getUser.invalidate({ userId: user.id })
      router.refresh()
    },
  })

  const canBypassBlur = user.stats?.canBypassBlur ?? false

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {user.isBlocked ? (
          <Badge variant="destructive" className="gap-1">
            <Ban className="h-3 w-3" />
            Blocked
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        )}
        {user.isAdmin && (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )}
        {user.hasPurchased && (
          <Badge variant="secondary" className="gap-1">
            <CreditCard className="h-3 w-3" />
            Paid User
          </Badge>
        )}
        {!user.isPrimaryDeviceAccount && (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
            <Smartphone className="h-3 w-3" />
            Secondary Account
          </Badge>
        )}
        {canBypassBlur && (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <Eye className="h-3 w-3" />
            Blur Bypass
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary Actions - Always visible */}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/works?userId=${user.id}`}>
            <Film className="h-4 w-4 mr-2" />
            Works
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/orders/${user.id}`}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Orders
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/credits/${user.id}`}>
            <Coins className="h-4 w-4 mr-2" />
            Credits
          </Link>
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Blur Bypass Toggle */}
            <DropdownMenuItem
              onClick={() => setBlurBypassMutation.mutate({ userId: user.id, enabled: !canBypassBlur })}
              disabled={setBlurBypassMutation.isPending}
            >
              {canBypassBlur ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Remove Blur Bypass
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Enable Blur Bypass
                </>
              )}
            </DropdownMenuItem>

            {/* Reset Offer */}
            <DropdownMenuItem
              onClick={() => resetOfferMutation.mutate({ userId: user.id })}
              disabled={resetOfferMutation.isPending}
            >
              <Timer className="h-4 w-4 mr-2" />
              Reset Offer
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Block/Unblock */}
            {user.isBlocked ? (
              <DropdownMenuItem
                onClick={() => unblockMutation.mutate({ userId: user.id })}
                disabled={unblockMutation.isPending}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Unblock User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => blockMutation.mutate({ userId: user.id })}
                disabled={blockMutation.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete Button - Requires confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {user.email} and all their data (videos, orders, subscriptions, etc). This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate({ userId: user.id })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

