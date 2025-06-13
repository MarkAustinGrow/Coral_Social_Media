"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { RecentActivity } from "@/components/recent-activity"
import { SystemStatusPanel } from "@/components/system-status-panel"
import { StatsCards } from "@/components/stats-cards"
import { QuickActions } from "@/components/quick-actions"
import { Settings } from "lucide-react"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Monitor and manage your social media agent system.">
        <div className="flex items-center gap-2">
          <Button variant="outline">Refresh Data</Button>
          <Button>Start All Agents</Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current status of all system components</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <SystemStatusPanel />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Key metrics from your system</CardDescription>
          </CardHeader>
          <CardContent>
            <StatsCards />
          </CardContent>
          <CardFooter>
            <QuickActions />
          </CardFooter>
        </Card>
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events from your system</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="outline" asChild>
              <Link href="/logs">View All Logs</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="mt-6 flex justify-end">
        <Link href="/setup">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Setup Wizard
          </Button>
        </Link>
      </div>
    </DashboardShell>
  )
}
