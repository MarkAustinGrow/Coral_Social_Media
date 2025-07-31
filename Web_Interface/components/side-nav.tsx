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
  Database,
  Sparkles,
} from "lucide-react"
import { CoralIcon } from "./coral-icon"

const items = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Coral Inspector",
    href: "/coral-inspector",
    icon: CoralIcon,
  },
  {
    title: "Coral Studio",
    href: "/coral-studio",
    icon: Sparkles,
  },
  {
    title: "X Accounts",
    href: "/accounts",
    icon: Twitter,
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
    title: "Research Memory",
    href: "/memory",
    icon: Database,
  },
  {
    title: "Persona Config",
    href: "/persona",
    icon: Users,
  },
  {
    title: "Agent Status & Logs",
    href: "/logs",
    icon: Zap,
  },
  {
    title: "Engagement Metrics",
    href: "/metrics",
    icon: BarChart3,
  },
  {
    title: "Content Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "X API Usage",
    href: "/x-api",
    icon: Gauge,
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
      <div className="space-y-2.5 py-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              pathname === item.href ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground",
            )}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
