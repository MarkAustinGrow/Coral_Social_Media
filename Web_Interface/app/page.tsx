"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard-shell"
import { StatsCards } from "@/components/stats-cards"
import { RecentActivity } from "@/components/recent-activity"
import { QuickActions } from "@/components/quick-actions"
import { AgentStatusPanel } from "@/components/agent-status-panel"
import { SystemStatusPanel } from "@/components/system-status-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, RefreshCw } from "lucide-react"

export default function DashboardPage() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  
  useEffect(() => {
    // Check if setup is complete
    try {
      const storedConfig = localStorage.getItem("social-media-agent-config")
      setIsSetupComplete(!!storedConfig)
    } catch (error) {
      console.error("Error checking setup status:", error)
      setIsSetupComplete(false)
    }
  }, [])
  
  // Mock data for the dashboard
  const stats = [
    { title: "Total Tweets Collected", value: "2,543", change: "+12.3%", changeType: "positive" },
    { title: "Blogs Generated", value: "47", change: "+5.2%", changeType: "positive" },
    { title: "Tweet Threads Created", value: "128", change: "-2.1%", changeType: "negative" },
    { title: "Engagement Rate", value: "3.2%", change: "+0.8%", changeType: "positive" },
  ]
  
  return (
    <DashboardShell>
      {!isSetupComplete && (
        <Card className="mb-6 border-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-500">Setup Required</CardTitle>
            <CardDescription>
              Your system needs to be configured before it can be used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <p className="text-sm">
                Complete the setup wizard to configure your API keys, database, and agents.
              </p>
              <Link href="/setup">
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Setup Wizard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCards data={stats} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <div className="col-span-4">
          <RecentActivity />
        </div>
        <div className="col-span-3">
          <div className="grid gap-6">
            <QuickActions />
            <AgentStatusPanel />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <SystemStatusPanel />
      </div>
      
      {isSetupComplete && (
        <div className="mt-6 flex justify-end">
          <Link href="/setup">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconfigure System
            </Button>
          </Link>
        </div>
      )}
    </DashboardShell>
  )
}
