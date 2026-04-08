/* eslint-disable @next/next/no-img-element */
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Coins, User } from "lucide-react"

interface CreditsTableProps {
  users: Array<{
    id: string
    name: string | null
    email: string | null
    image: string | null
  }>
  isLoading: boolean
  onManageClick: (user: { id: string; name: string | null }) => void
}

export function CreditsTable({ users, isLoading, onManageClick }: CreditsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        <p>No users found</p>
      </div>
    )
  }

  return (
    <div className="border rounded-md bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img 
                      src={user.image} 
                      alt={user.name || ""} 
                      className="w-8 h-8 rounded-full bg-muted object-cover" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span>{user.name || "N/A"}</span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onManageClick({ id: user.id, name: user.name })}
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Manage Credits
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

