import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { BlogList } from "@/components/blog-list"
import { Search, Plus } from "lucide-react"

export const metadata: Metadata = {
  title: "Blog Interface | Social Media Agent System",
  description: "View, manage, and approve blog content",
}

export default function BlogsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Blog Interface" text="View, manage, and approve blog content.">
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Blog
          </Button>
        </div>
      </DashboardHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search blogs..." className="w-full pl-8" />
          </div>
        </div>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <BlogList />
          </TabsContent>
          <TabsContent value="draft" className="space-y-4">
            <BlogList status="draft" />
          </TabsContent>
          <TabsContent value="review" className="space-y-4">
            <BlogList status="review" />
          </TabsContent>
          <TabsContent value="published" className="space-y-4">
            <BlogList status="published" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
