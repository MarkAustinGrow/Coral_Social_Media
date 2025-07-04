"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, AlertCircle, Info, AlertTriangle, RefreshCw } from "lucide-react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { DataState } from "@/components/ui/data-state"

// Interface for log entries
interface LogEntry {
  id: number
  timestamp: string
  level: "info" | "warning" | "error"
  agent_name: string
  message: string
  metadata: any
  created_at: string
}

interface LogViewerProps {
  level?: string
  limit?: number
}

export function LogViewer({ level, limit = 50 }: LogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  
  // Reset page when level changes
  useEffect(() => {
    setPage(1)
  }, [level])
  
  // Fetch logs from the agent_logs table
  const logsResult = useSupabaseData<LogEntry>(
    'agent_logs',
    { 
      columns: '*',
      filter: level ? [{ column: 'level', value: level }] : [],
      orderBy: { column: 'timestamp', ascending: false },
      limit: limit
    },
    refreshKey
  )
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Handle load more
  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "info":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Info className="mr-1 h-3 w-3" />
            Info
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Warning
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <DataState
      isLoading={logsResult.isLoading}
      error={logsResult.error}
      data={logsResult.data}
      onRetry={handleRefresh}
      loadingComponent={
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="animate-pulse bg-muted rounded h-10 w-full"></div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead className="w-[180px]">Agent</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="animate-pulse bg-muted rounded h-4 w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="animate-pulse bg-muted rounded h-6 w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="animate-pulse bg-muted rounded h-4 w-28"></div>
                    </TableCell>
                    <TableCell>
                      <div className="animate-pulse bg-muted rounded h-4 w-full"></div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      }
      emptyComponent={
        <div className="text-center p-8 border rounded-lg">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <h3 className="font-medium mb-1">No Logs Found</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {level 
              ? `No ${level} logs are available.` 
              : "No logs are available in the system."}
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      }
    >
      {(logs) => {
        // Filter logs based on search query
        const filteredLogs = logs.filter((log) => 
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.agent_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        // Limit logs based on page
        const paginatedLogs = filteredLogs.slice(0, page * limit);
        
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search logs..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Level</TableHead>
                    <TableHead className="w-[180px]">Agent</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No logs found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell>{getLevelBadge(log.level)}</TableCell>
                        <TableCell>{log.agent_name}</TableCell>
                        <TableCell>{log.message}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {paginatedLogs.length < filteredLogs.length && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" size="sm" onClick={handleLoadMore}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        );
      }}
    </DataState>
  )
}
