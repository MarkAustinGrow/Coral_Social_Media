import type React from "react"
interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 sm:pt-6 md:p-6 lg:p-8">{children}</div>
}
