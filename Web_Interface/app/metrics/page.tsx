import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { EngagementMetricsPanel } from "@/components/engagement-metrics-panel"

export const metadata: Metadata = {
  title: "Engagement Metrics | Social Media Agent System",
  description: "Configure content topic priorities and engagement metrics",
}

export default function MetricsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Engagement Metrics" text="Configure content topic priorities and engagement metrics." />
      <Card className="space-y-4">
        <CardContent className="pt-6">
          <EngagementMetricsPanel />
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
