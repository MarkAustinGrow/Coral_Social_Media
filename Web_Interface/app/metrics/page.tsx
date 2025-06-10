import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { EngagementMetricsPanel } from "@/components/engagement-metrics-panel"
import { EngagementTrendsPanel } from "@/components/engagement-trends-panel"
import { TopicSuggestionsPanel } from "@/components/topic-suggestions-panel"
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
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Topic Metrics</TabsTrigger>
          <TabsTrigger value="trends">Engagement Trends</TabsTrigger>
          <TabsTrigger value="suggestions">Topic Suggestions</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topic Engagement Metrics</CardTitle>
              <CardDescription>Configure topic priorities based on engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <EngagementMetricsPanel />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save Metrics</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>View engagement trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <EngagementTrendsPanel />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topic Suggestions</CardTitle>
              <CardDescription>AI-generated topic suggestions based on engagement data</CardDescription>
            </CardHeader>
            <CardContent>
              <TopicSuggestionsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
