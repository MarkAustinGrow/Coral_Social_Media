"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, MessageSquare, BarChart, Twitter } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockStats = {
  tweetsCollected: 12458,
  blogsCreated: 347,
  tweetsPosted: 2891,
  activeAccounts: 8,
}

export function StatsCards() {
  const [stats] = useState(mockStats)

  return (
    <div className="grid gap-4 grid-cols-2">
      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.tweetsCollected.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground text-center">Tweets Collected</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.blogsCreated.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground text-center">Blogs Created</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
            <Twitter className="h-6 w-6 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.tweetsPosted.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground text-center">Tweets Posted</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
            <BarChart className="h-6 w-6 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.activeAccounts}</div>
          <p className="text-xs text-muted-foreground text-center">Active X Accounts</p>
        </CardContent>
      </Card>
    </div>
  )
}
