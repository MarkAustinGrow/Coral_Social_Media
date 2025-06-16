"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BlogWithCritique } from "@/hooks/use-blog-data"
import { CheckCircle, XCircle } from "lucide-react"

interface BlogCritiqueDialogProps {
  blog: BlogWithCritique | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BlogCritiqueDialog({ blog, open, onOpenChange }: BlogCritiqueDialogProps) {
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
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending
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
          {/* Blog content preview */}
          <div className="border rounded-md p-4 bg-muted/30">
            <h3 className="text-sm font-medium mb-2">Blog Content Preview</h3>
            <div className="text-sm text-muted-foreground">
              {blog.content ? (
                <div className="max-h-40 overflow-y-auto">
                  {blog.content.substring(0, 500)}
                  {blog.content.length > 500 && "..."}
                </div>
              ) : (
                <p className="italic">No content available</p>
              )}
            </div>
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
              {blog.critique.decision !== "approved" && blog.critique.decision !== "rejected" && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-md p-6 text-center">
              <p className="text-muted-foreground">No critique available for this blog post.</p>
              {blog.status === "draft" && (
                <Button className="mt-4">
                  Submit for Review
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
