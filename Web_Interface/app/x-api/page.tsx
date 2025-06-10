import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiUsagePanel } from "@/components/api-usage-panel"

export const metadata: Metadata = {
  title: "X API Usage Control | Social Media Agent System",
  description: "Monitor and manage Twitter API usage",
}

export default function XApiPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="X API Usage Control" text="Monitor and manage Twitter API usage." />
      <div className="space-y-4">
        <ApiUsagePanel />
      </div>
    </DashboardShell>
  )
}
