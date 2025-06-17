"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { toast } from "sonner"
import { LogViewer } from "@/components/log-viewer"

export default function DebugLogsPage() {
  const [count, setCount] = useState(10)
  const [isAdding, setIsAdding] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Handle adding sample logs
  const handleAddSampleLogs = async () => {
    try {
      setIsAdding(true)
      
      // Call the API to add sample logs
      const response = await fetch(`/api/logs/add-sample?count=${count}`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add sample logs')
      }
      
      const data = await response.json()
      
      toast.success(data.message || `Added ${data.count} sample logs`)
      
      // Refresh the log viewer
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast.error(`Failed to add sample logs: ${error.message}`)
    } finally {
      setIsAdding(false)
    }
  }
  
  // Handle clearing all logs
  const handleClearLogs = async () => {
    try {
      // Confirm before clearing
      if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
        return
      }
      
      // Call the API to clear logs
      const response = await fetch('/api/logs/clear', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear logs')
      }
      
      toast.success('All logs cleared successfully')
      
      // Refresh the log viewer
      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      toast.error(`Failed to clear logs: ${error.message}`)
    }
  }
  
  return (
    <DashboardShell>
      <DashboardHeader heading="Debug Logs" text="Add sample logs for testing and view them in real-time.">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRefreshKey(prev => prev + 1)}>
            Refresh
          </Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-7 lg:col-span-2">
          <CardHeader>
            <CardTitle>Add Sample Logs</CardTitle>
            <CardDescription>Generate sample logs for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="count">Number of logs to add</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={handleAddSampleLogs}
              disabled={isAdding}
            >
              {isAdding ? 'Adding...' : `Add ${count} Sample Logs`}
            </Button>
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleClearLogs}
            >
              Clear All Logs
            </Button>
          </CardFooter>
        </Card>
        <Card className="col-span-7 lg:col-span-5">
          <CardHeader>
            <CardTitle>Log Preview</CardTitle>
            <CardDescription>View the most recent logs</CardDescription>
          </CardHeader>
          <CardContent>
            <LogViewer key={`debug-logs-${refreshKey}`} limit={20} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
