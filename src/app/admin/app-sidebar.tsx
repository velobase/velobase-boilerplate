"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Users,
  LayoutDashboard,
  Shield,
  Coins,
  SquareStack,
  Package,
  ShoppingCart,
  Ticket,
  HandCoins,
  Receipt,
  CalendarClock,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { title: "Overview", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "用户 & 内容",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Dialogs", url: "/admin/dialogs", icon: SquareStack },
    ],
  },
  {
    label: "商业",
    items: [
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
      { title: "Credits", url: "/admin/credits", icon: Coins },
      { title: "Promo Codes", url: "/admin/promo-codes", icon: Ticket },
    ],
  },
  {
    label: "联盟",
    items: [
      { title: "Commissions", url: "/admin/affiliate/commissions", icon: Receipt },
      { title: "Payouts", url: "/admin/affiliate/payouts", icon: HandCoins },
    ],
  },
  {
    label: "触达",
    items: [
      { title: "Scenes", url: "/admin/touches/scenes", icon: Megaphone },
      { title: "Schedules", url: "/admin/touches", icon: CalendarClock },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/admin") return pathname === "/admin"
    return pathname === url || pathname.startsWith(url + "/")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Admin</span>
                  <span className="text-xs text-muted-foreground">Console</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to App">
              <Link href="/">
                <span className="text-xs text-muted-foreground">← Back to App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
