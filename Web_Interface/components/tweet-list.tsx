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
import { Calendar, Edit, ExternalLink, MoreHorizontal, Send, Trash2, MessageSquare } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockTweets = [
  {
    id: 1,
    content:
      "Just published a new blog post: 'The Future of AI in Social Media Marketing' - check it out! #AI #SocialMedia",
    status: "posted",
    timestamp: "2025-06-10T14:30:00Z",
    source: "blog",
    sourceId: 1,
    isThread: false,
    threadPosition: null,
    account: "@techcompany",
  },
  {
    id: 2,
    content:
      "1/ We're excited to announce our new AI-powered social media management platform! This revolutionary tool will transform how you handle your online presence.",
    status: "scheduled",
    timestamp: "2025-06-11T10:00:00Z",
    source: "direct",
    sourceId: null,
    isThread: true,
    threadPosition: 1,
    account: "@techcompany",
  },
  {
    id: 3,
    content:
      "2/ With our new platform, you can automate content creation, schedule posts, and analyze engagement - all in one place!",
    status: "scheduled",
    timestamp: "2025-06-11T10:00:10Z",
    source: "direct",
    sourceId: null,
    isThread: true,
    threadPosition: 2,
    account: "@techcompany",
  },
  {
    id: 4,
    content:
      "3/ Sign up for early access at example.com/early-access and get 3 months free! #SocialMedia #AI #Marketing",
    status: "scheduled",
    timestamp: "2025-06-11T10:00:20Z",
    source: "direct",
    sourceId: null,
    isThread: true,
    threadPosition: 3,
    account: "@techcompany",
  },
  {
    id: 5,
    content:
      "Looking for ways to improve your Twitter engagement? Our latest blog post has 10 actionable tips! Read now: example.com/blog/twitter-tips",
    status: "failed",
    timestamp: "2025-06-09T16:45:00Z",
    source: "blog",
    sourceId: 2,
    isThread: false,
    threadPosition: null,
    account: "@techcompany",
  },
  {
    id: 6,
    content:
      "Understanding algorithm changes is crucial for social media success in 2025. Our analysis breaks down what you need to know: example.com/blog/algorithm-changes",
    status: "scheduled",
    timestamp: "2025-06-12T09:30:00Z",
    source: "blog",
    sourceId: 3,
    isThread: false,
    threadPosition: null,
    account: "@techcompany",
  },
  {
    id: 7,
    content:
      "How do you measure ROI on your social media campaigns? Share your thoughts below! #SocialMediaROI #Marketing",
    status: "posted",
    timestamp: "2025-06-08T11:15:00Z",
    source: "blog",
    sourceId: 7,
    isThread: false,
    threadPosition: null,
    account: "@techcompany",
  },
  {
    id: 8,
    content:
      "Emerging social platforms to watch in 2025 - our analysis of what's next in social media: example.com/blog/emerging-platforms",
    status: "scheduled",
    timestamp: "2025-06-13T14:00:00Z",
    source: "blog",
    sourceId: 8,
    isThread: false,
    threadPosition: null,
    account: "@techcompany",
  },
]

interface TweetListProps {
  status?: string
}

export function TweetList({ status }: TweetListProps) {
  const [tweets, setTweets] = useState(status ? mockTweets.filter((tweet) => tweet.status === status) : mockTweets)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Posted
          </Badge>
        )
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Scheduled
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  const getSourceBadge = (source: string, sourceId: number | null) => {
    switch (source) {
      case "blog":
        return <Badge variant="secondary">Blog #{sourceId}</Badge>
      case "direct":
        return <Badge variant="secondary">Direct</Badge>
      default:
        return null
    }
  }

  // Group tweets by thread
  const groupedTweets = tweets.reduce((acc: any[], tweet) => {
    if (!tweet.isThread) {
      acc.push([tweet])
      return acc
    }

    // Find existing thread or create new one
    const existingThread = acc.find(
      (group) =>
        group.length > 0 &&
        group[0].isThread &&
        group[0].timestamp.split("T")[0] === tweet.timestamp.split("T")[0] &&
        group[0].account === tweet.account,
    )

    if (existingThread) {
      existingThread.push(tweet)
      existingThread.sort((a, b) => a.threadPosition - b.threadPosition)
    } else {
      acc.push([tweet])
    }

    return acc
  }, [])

  return (
    <div className="space-y-6">
      {groupedTweets.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-2 rounded-lg border p-4">
          {group.length > 1 && (
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Thread ({group.length} tweets)</span>
              <span className="text-xs text-muted-foreground">{group[0].account}</span>
            </div>
          )}

          {group.map((tweet, tweetIndex) => (
            <div
              key={tweet.id}
              className={`flex items-start justify-between p-3 ${group.length > 1 ? "border-l-2 ml-2 pl-4" : ""}`}
            >
              <div className="grid gap-1 flex-1">
                {group.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    Tweet {tweet.threadPosition} of {group.length}
                  </div>
                )}
                <div className="text-sm">{tweet.content}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {getStatusBadge(tweet.status)}
                  {getSourceBadge(tweet.source, tweet.sourceId)}
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(tweet.timestamp)}
                  </div>
                  {!group.length > 1 && <div className="text-xs text-muted-foreground">{tweet.account}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {tweet.status === "posted" ? (
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {tweet.status !== "posted" && (
                      <DropdownMenuItem>
                        <Send className="mr-2 h-4 w-4" />
                        Post Now
                      </DropdownMenuItem>
                    )}
                    {tweet.status === "scheduled" && (
                      <DropdownMenuItem>
                        <Calendar className="mr-2 h-4 w-4" />
                        Reschedule
                      </DropdownMenuItem>
                    )}
                    {tweet.status === "posted" && (
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on X
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
      ))}
    </div>
  )
}
