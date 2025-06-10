"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, AlertCircle, Info, AlertTriangle } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockLogs = [
  {
    id: 1,
    timestamp: "2025-06-10T09:25:43Z",
    level: "info",
    agent: "Tweet Scraping Agent",
    message: "Successfully fetched 15 tweets from @OpenAI",
  },
  {
    id: 2,
    timestamp: "2025-06-10T09:24:12Z",
    level: "info",
    agent: "Tweet Research Agent",
    message: "Analyzed 10 tweets and stored insights in Qdrant",
  },
  {
    id: 3,
    timestamp: "2025-06-10T09:20:05Z",
    level: "info",
    agent: "Twitter Posting Agent",
    message: "Posted tweet thread (ID: 12345) with 4 tweets",
  },
  {
    id: 4,
    timestamp: "2025-06-10T09:15:22Z",
    level: "error",
    agent: "Blog Writing Agent",
    message: "API rate limit exceeded when calling OpenAI API",
  },
  {
    id: 5,
    timestamp: "2025-06-10T09:10:18Z",
    level: "warning",
    agent: "X Reply Agent",
    message: "Tweet reply generation took longer than expected (5.2s)",
  },
  {
    id: 6,
    timestamp: "2025-06-10T09:05:30Z",
    level: "info",
    agent: "Blog to Tweet Agent",
    message: "Converted blog post 'The Future of AI' to tweet thread",
  },
  {
    id: 7,
    timestamp: "2025-06-10T09:00:15Z",
    level: "warning",
    agent: "Tweet Scraping Agent",
    message: "Rate limit warning: 10% of daily quota remaining",
  },
  {
    id: 8,
    timestamp: "2025-06-10T08:55:43Z",
    level: "info",
    agent: "Tweet Research Agent",
    message: "Created new Qdrant collection 'tweet_insights'",
  },
  {
    id: 9,
    timestamp: "2025-06-10T08:50:22Z",
    level: "error",
    agent: "X Reply Agent",
    message: "Failed to post reply: Tweet with ID 98765 not found",
  },
  {
    id: 10,
    timestamp: "2025-06-10T08:45:10Z",
    level: "info",
    agent: "Blog Writing Agent",
    message: "Generated new blog post: 'Understanding Algorithm Changes in 2025'",
  },
]

interface LogViewerProps {
  level?: string
}

export function LogViewer({ level }: LogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [logs, setLogs] = useState(
    level ? mockLogs.filter((log) => log.level === level) : mockLogs
  )

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

  const filteredLogs = logs.filter((log) => 
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.agent.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell>{getLevelBadge(log.level)}</TableCell>
                  <TableCell>{log.agent}</TableCell>
                  <TableCell>{log.message}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
