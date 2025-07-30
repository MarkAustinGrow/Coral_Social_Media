"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { BlogWithCritique } from "@/hooks/use-blog-data"

interface BlogCritiqueDialogProps {
  blog: BlogWithCritique | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BlogCritiqueDialog({ blog, open, onOpenChange }: BlogCritiqueDialogProps) {
  const [showFullContent, setShowFullContent] = useState(false)
  
  if (!blog) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "approve":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✅ Approved
          </Badge>
        )
      case "reject":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            ❌ Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            ⏳ Pending
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{blog.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <span>Created: {formatDate(blog.created_at)}</span>
            {blog.published_at && (
              <>
                <span>•</span>
                <span>Published: {formatDate(blog.published_at)}</span>
              </>
            )}
            <span>•</span>
            <span>{blog.word_count} words</span>
            <span>•</span>
            <span>Status: {blog.status}</span>
            {blog.review_status && (
              <>
                <span>•</span>
                <span>Review: {blog.review_status.replace(/_/g, ' ')}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Blog content with expandable functionality */}
          <div className="border rounded-md p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                📖 {showFullContent ? "Full Blog Content" : "Blog Content Preview"}
              </h3>
              {blog.content && blog.content.length > 500 && (
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  {showFullContent ? "▲ Show Less" : "▼ Show More"}
                </button>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {blog.content ? (
                <div className={showFullContent ? "max-h-96 overflow-y-auto" : "max-h-40 overflow-y-auto"}>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                    {showFullContent 
                      ? blog.content 
                      : `${blog.content.substring(0, 500)}${blog.content.length > 500 ? "..." : ""}`
                    }
                  </div>
                </div>
              ) : (
                <p className="italic">No content available</p>
              )}
            </div>
            {blog.content && blog.content.length > 500 && !showFullContent && (
              <div className="mt-2 pt-2 border-t border-muted">
                <p className="text-xs text-muted-foreground">
                  Showing first 500 characters of {blog.word_count} word blog post
                </p>
              </div>
            )}
          </div>

          {/* Critique section */}
          {blog.critique ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Critique</h3>
                <div className="flex items-center gap-2">
                  {getDecisionBadge(blog.critique.decision)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(blog.critique.created_at)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <p className="text-sm">{blog.critique.summary}</p>
                </div>

                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2">Detailed Critique</h4>
                  <div className="text-sm whitespace-pre-line">
                    {blog.critique.critique}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {blog.critique.decision !== "approve" && blog.critique.decision !== "reject" && (
                <div className="flex justify-end gap-2 mt-4">
                  <button className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded transition-colors">
                    ❌ Reject
                  </button>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors">
                    ✅ Approve
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-md p-6 text-center">
              <p className="text-muted-foreground">No critique available for this blog post.</p>
              {blog.status === "draft" && (
                <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                  Submit for Review
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
