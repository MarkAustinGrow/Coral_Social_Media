"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AgentStatusPanel } from "@/components/agent-status-panel"
import { LogViewer } from "@/components/log-viewer"
import { RefreshCw, Download } from "lucide-react"
import { toast } from "sonner"

export default function LogsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    toast.success("Refreshed agent status and logs")
  }
  
  // Handle export logs
  const handleExportLogs = async () => {
    try {
      setIsExporting(true)
      
      // Call the API to export logs
      const response = await fetch('/api/logs/export', {
        method: 'GET',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export logs')
      }
      
      // Get the logs data
      const logs = await response.json()
      
      // Convert to CSV
      const csvContent = convertLogsToCSV(logs)
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `agent_logs_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("Logs exported successfully")
    } catch (error: any) {
      toast.error(`Failed to export logs: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }
  
  // Convert logs to CSV
  const convertLogsToCSV = (logs: any[]) => {
    // CSV header
    const header = ['Timestamp', 'Level', 'Agent', 'Message']
    
    // Format each log entry as a CSV row
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.level,
      log.agent_name,
      // Escape quotes in the message
      `"${log.message.replace(/"/g, '""')}"`
    ])
    
    // Combine header and rows
    return [header, ...rows].map(row => row.join(',')).join('\n')
  }
  
  return (
    <DashboardShell>
      <DashboardHeader heading="Agent Status & Logs" text="Monitor agent status and view system logs.">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportLogs}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Logs'}
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
            <AgentStatusPanel key={`agent-status-${refreshKey}`} />
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
              <LogViewer key={`logs-all-${refreshKey}`} />
            </TabsContent>
            <TabsContent value="info" className="p-0 pt-4">
              <LogViewer key={`logs-info-${refreshKey}`} level="info" />
            </TabsContent>
            <TabsContent value="warning" className="p-0 pt-4">
              <LogViewer key={`logs-warning-${refreshKey}`} level="warning" />
            </TabsContent>
            <TabsContent value="error" className="p-0 pt-4">
              <LogViewer key={`logs-error-${refreshKey}`} level="error" />
            </TabsContent>
          </Tabs>
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <div className="text-xs text-muted-foreground">
              Showing logs from the database in real-time
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  )
}
