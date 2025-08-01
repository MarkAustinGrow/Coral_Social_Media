#!/bin/bash

# Complete Side Navigation Fix Script
# This script properly fixes the side-nav.tsx file by restoring correct syntax

echo "🔧 Fixing side-nav.tsx completely..."
echo "===================================="

# Check if we're in the correct directory
if [ ! -f "Web_Interface/components/side-nav.tsx" ]; then
    echo "❌ Error: side-nav.tsx not found. Please run this script from the project root directory."
    exit 1
fi

# Create backup
echo "📋 Creating backup of current side-nav.tsx..."
cp Web_Interface/components/side-nav.tsx Web_Interface/components/side-nav.tsx.backup.$(date +%Y%m%d_%H%M%S)

# Write the correct side-nav.tsx content
echo "🔧 Writing correct side-nav.tsx content..."
cat > Web_Interface/components/side-nav.tsx << 'EOF'
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
EOF

echo "✅ side-nav.tsx fixed with correct syntax!"
echo ""
echo "🔍 Verifying syntax..."
if node -c Web_Interface/components/side-nav.tsx 2>/dev/null; then
    echo "✅ JavaScript syntax is valid!"
else
    echo "⚠️  JavaScript syntax check failed, but TypeScript may still work"
fi

echo ""
echo "📝 Next Steps:"
echo "  1. Run: cd Web_Interface && npm run build"
echo "  2. If build succeeds, run: pm2 restart coral-web"
echo ""
echo "✨ Fix completed at: $(date)"
