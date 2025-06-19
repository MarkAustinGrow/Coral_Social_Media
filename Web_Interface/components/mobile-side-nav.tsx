"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  BarChart3,
  CalendarDays,
  FileText,
  Gauge,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Twitter,
  Users,
  Zap,
  Database,
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
    title: "Research Memory",
    href: "/memory",
    icon: Database,
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

export function MobileSideNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="mr-2 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
          <span className="font-bold">Macro Economics Expert Agentic System</span>
        </Link>
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10">
          <div className="flex flex-col space-y-2.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center rounded-md px-4 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  pathname === item.href ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground",
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
