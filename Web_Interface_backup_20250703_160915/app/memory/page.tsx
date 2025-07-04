import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { MemoryDashboard } from "@/components/memory-dashboard"

export const metadata: Metadata = {
  title: "Memory Management | Social Media Agent System",
  description: "Search and manage knowledge collected in Qdrant vector database",
}

export default function MemoryPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Research Memory Viewer"
        text="Search and manage knowledge collected by the Tweet Research Agent."
      />
      <div className="space-y-4">
        <MemoryDashboard />
      </div>
    </DashboardShell>
  )
}
