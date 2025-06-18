import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { EngagementMetricsPanel } from "@/components/engagement-metrics-panel"
import { Save, Download, Upload, RefreshCw } from "lucide-react"

export const metadata: Metadata = {
  title: "Engagement Metrics | Social Media Agent System",
  description: "Configure content topic priorities and engagement metrics",
}

export default function MetricsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Engagement Metrics" text="Configure content topic priorities and engagement metrics.">
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DashboardHeader>
      <Card className="space-y-4">
        <CardContent className="pt-6">
          <EngagementMetricsPanel />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Save Metrics</Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  )
}
