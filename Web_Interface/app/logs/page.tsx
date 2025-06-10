import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AgentStatusPanel } from "@/components/agent-status-panel"
import { LogViewer } from "@/components/log-viewer"
import { RefreshCw, Download } from "lucide-react"

export const metadata: Metadata = {
  title: "Agent Status & Logs | Social Media Agent System",
  description: "Monitor agent status and view system logs",
}

export default function LogsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Agent Status & Logs" text="Monitor agent status and view system logs.">
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>Current status of all system agents</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentStatusPanel />
          </CardContent>
        </Card>
        <Card className="col-span-7">
          <CardHeader className="space-y-0.5">
            <CardTitle>System Logs</CardTitle>
            <CardDescription>View and filter system logs</CardDescription>
          </CardHeader>
          <Tabs defaultValue="all" className="px-6">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="all">All Logs</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="warning">Warning</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="p-0 pt-4">
              <LogViewer />
            </TabsContent>
            <TabsContent value="info" className="p-0 pt-4">
              <LogViewer level="info" />
            </TabsContent>
            <TabsContent value="warning" className="p-0 pt-4">
              <LogViewer level="warning" />
            </TabsContent>
            <TabsContent value="error" className="p-0 pt-4">
              <LogViewer level="error" />
            </TabsContent>
          </Tabs>
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <div className="text-xs text-muted-foreground">
              Showing logs from the last 24 hours
            </div>
            <Button variant="outline" size="sm">
              Load More
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  )
}
