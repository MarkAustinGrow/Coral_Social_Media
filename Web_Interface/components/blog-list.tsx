"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Eye, Edit, Trash2, MoreHorizontal, ExternalLink, CheckCircle, RefreshCw } from "lucide-react"
import { useBlogData, useFallbackBlogData, BlogWithCritique } from "@/hooks/use-blog-data"
import { DataState } from "@/components/ui/data-state"
import { BlogCritiqueDialog } from "@/components/blog-critique-dialog"

interface BlogListProps {
  status?: string
  withCritiques?: boolean
}

export function BlogList({ status, withCritiques }: BlogListProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedBlog, setSelectedBlog] = useState<BlogWithCritique | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Use the real data hook with fallback to mock data if API fails
  const { data, isLoading, error } = useBlogData({ status, withCritiques }, refreshKey)
  
  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }
  
  // Handle view blog click
  const handleViewBlog = (blog: BlogWithCritique) => {
    setSelectedBlog(blog)
    setDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Published
          </Badge>
        )
      case "review":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Review
          </Badge>
        )
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Draft
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <>
      <DataState
        isLoading={isLoading}
        error={error ? { message: 'Error loading blogs', details: error.message } : null}
        data={data}
        onRetry={handleRefresh}
        loadingComponent={
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="grid gap-1 w-full">
                  <div className="h-5 w-3/4 animate-pulse bg-muted rounded"></div>
                  <div className="h-4 w-1/2 animate-pulse bg-muted rounded mt-1"></div>
                  <div className="flex gap-1 mt-2">
                    <div className="h-5 w-20 animate-pulse bg-muted rounded"></div>
                    <div className="h-5 w-16 animate-pulse bg-muted rounded"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 animate-pulse bg-muted rounded"></div>
                  <div className="h-8 w-8 animate-pulse bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        }
        errorComponent={
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
            <h3 className="font-medium mb-2">Failed to load blogs</h3>
            <p className="text-sm mb-3">{error?.message}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        }
      >
        {(blogs) => (
          <div className="space-y-4">
            {blogs.map((blog) => (
              <div key={blog.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="grid gap-1">
                  <div className="font-medium">{blog.title}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatDate(blog.created_at)}</span>
                    <span>•</span>
                    <span>{blog.word_count} words</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getStatusBadge(blog.status)}
                    {blog.review_status && (
                      <Badge variant="outline" className="text-xs">
                        {blog.review_status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {blog.critique && (
                      <Badge variant="secondary" className="text-xs">
                        {blog.critique.decision === "approved" 
                          ? "Approved" 
                          : blog.critique.decision === "rejected"
                            ? "Rejected"
                            : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleViewBlog(blog)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {blog.status === "review" && (
                        <DropdownMenuItem>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                      )}
                      {blog.status === "published" && (
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Live
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>
      
      {/* Blog critique dialog */}
      <BlogCritiqueDialog 
        blog={selectedBlog} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  )
}
