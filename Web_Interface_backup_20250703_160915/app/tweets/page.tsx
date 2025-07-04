import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TweetList } from "@/components/tweet-list"
import { Search, Plus } from "lucide-react"

export const metadata: Metadata = {
  title: "Tweets Interface | Social Media Agent System",
  description: "View and manage system-generated tweets",
}

export default function TweetsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Tweets Interface" text="View and manage system-generated tweets.">
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Tweet
          </Button>
        </div>
      </DashboardHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search tweets..." className="w-full pl-8" />
          </div>
        </div>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="posted">Posted</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <TweetList />
          </TabsContent>
          <TabsContent value="scheduled" className="space-y-4">
            <TweetList status="scheduled" />
          </TabsContent>
          <TabsContent value="posted" className="space-y-4">
            <TweetList status="posted" />
          </TabsContent>
          <TabsContent value="failed" className="space-y-4">
            <TweetList status="failed" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
