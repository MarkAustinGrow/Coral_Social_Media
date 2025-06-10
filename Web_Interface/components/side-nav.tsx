"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  CalendarDays,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Twitter,
  Users,
  Zap,
} from "lucide-react"

const items = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "X API Usage",
    href: "/x-api",
    icon: Gauge,
  },
  {
    title: "Blog Interface",
    href: "/blogs",
    icon: FileText,
  },
  {
    title: "Tweets Interface",
    href: "/tweets",
    icon: MessageSquare,
  },
  {
    title: "X Accounts",
    href: "/accounts",
    icon: Twitter,
  },
  {
    title: "Agent Status & Logs",
    href: "/logs",
    icon: Zap,
  },
  {
    title: "Content Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Persona Config",
    href: "/persona",
    icon: Users,
  },
  {
    title: "Engagement Metrics",
    href: "/metrics",
    icon: BarChart3,
  },
  {
    title: "System Config",
    href: "/config",
    icon: Settings,
  },
]

export function SideNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden w-full flex-col md:flex">
      <div className="space-y-1 py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent" : "transparent",
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
