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
import { Eye, Edit, Trash2, MoreHorizontal, ExternalLink, CheckCircle } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockBlogs = [
  {
    id: 1,
    title: "The Future of AI in Social Media Marketing",
    createdAt: "2025-06-08T14:30:00Z",
    status: "published",
    wordCount: 1250,
    tags: ["AI", "Social Media", "Marketing"],
  },
  {
    id: 2,
    title: "10 Ways to Improve Your Twitter Engagement",
    createdAt: "2025-06-09T10:15:00Z",
    status: "review",
    wordCount: 980,
    tags: ["Twitter", "Engagement", "Tips"],
  },
  {
    id: 3,
    title: "Understanding Algorithm Changes in 2025",
    createdAt: "2025-06-10T08:45:00Z",
    status: "draft",
    wordCount: 1540,
    tags: ["Algorithm", "Social Media", "Strategy"],
  },
  {
    id: 4,
    title: "How to Create Viral Content That Converts",
    createdAt: "2025-06-07T16:20:00Z",
    status: "published",
    wordCount: 1120,
    tags: ["Viral", "Content", "Conversion"],
  },
  {
    id: 5,
    title: "The Psychology Behind Social Sharing",
    createdAt: "2025-06-06T11:30:00Z",
    status: "review",
    wordCount: 1680,
    tags: ["Psychology", "Social Media", "Sharing"],
  },
  {
    id: 6,
    title: "Building a Consistent Brand Voice Across Platforms",
    createdAt: "2025-06-05T09:15:00Z",
    status: "draft",
    wordCount: 1350,
    tags: ["Brand Voice", "Consistency", "Strategy"],
  },
  {
    id: 7,
    title: "Measuring ROI on Your Social Media Campaigns",
    createdAt: "2025-06-04T13:45:00Z",
    status: "published",
    wordCount: 1420,
    tags: ["ROI", "Analytics", "Campaigns"],
  },
  {
    id: 8,
    title: "Emerging Social Platforms to Watch in 2025",
    createdAt: "2025-06-03T15:30:00Z",
    status: "review",
    wordCount: 1050,
    tags: ["Trends", "Platforms", "Strategy"],
  },
  {
    id: 9,
    title: "AI-Generated Content: Ethics and Best Practices",
    createdAt: "2025-06-02T10:00:00Z",
    status: "draft",
    wordCount: 1780,
    tags: ["AI", "Ethics", "Content"],
  },
  {
    id: 10,
    title: "Leveraging User-Generated Content for Brand Growth",
    createdAt: "2025-06-01T14:15:00Z",
    status: "published",
    wordCount: 1230,
    tags: ["UGC", "Brand Growth", "Strategy"],
  },
]

interface BlogListProps {
  status?: string
}

export function BlogList({ status }: BlogListProps) {
  const [blogs, setBlogs] = useState(status ? mockBlogs.filter((blog) => blog.status === status) : mockBlogs)

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
    <div className="space-y-4">
      {blogs.map((blog) => (
        <div key={blog.id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="grid gap-1">
            <div className="font-medium">{blog.title}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDate(blog.createdAt)}</span>
              <span>•</span>
              <span>{blog.wordCount} words</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {getStatusBadge(blog.status)}
              {blog.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
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
  )
}
