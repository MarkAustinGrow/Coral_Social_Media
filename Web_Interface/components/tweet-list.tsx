"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, Edit, ExternalLink, MoreHorizontal, Send, Trash2, MessageSquare, RefreshCw } from "lucide-react"
import { useTweetData, postTweet, postThread, deleteTweet, updateTweet, Tweet } from "@/hooks/use-tweet-data"
import { DataState } from "@/components/ui/data-state"
import { useToast } from "@/hooks/use-toast"

interface TweetListProps {
  status?: string
}

export function TweetList({ status }: TweetListProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: tweets, isLoading, error } = useTweetData({ status }, refreshKey)
  const { toast } = useToast()
  const [postingTweetIds, setPostingTweetIds] = useState<number[]>([])
  const [deletingTweetIds, setDeletingTweetIds] = useState<number[]>([])
  const [updatingTweetIds, setUpdatingTweetIds] = useState<number[]>([])
  const [tweetToDelete, setTweetToDelete] = useState<Tweet | null>(null)
  const [tweetToEdit, setTweetToEdit] = useState<Tweet | null>(null)
  const [editedContent, setEditedContent] = useState<string>("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Group tweets by blog post ID and position
  const groupTweets = (tweets: Tweet[]) => {
    if (!tweets) return []

    // First, group by blog_post_id
    const blogPostGroups: { [key: string]: Tweet[] } = {}
    
    tweets.forEach(tweet => {
      const key = `${tweet.blog_post_id || 'direct'}`
      if (!blogPostGroups[key]) {
        blogPostGroups[key] = []
      }
      blogPostGroups[key].push(tweet)
    })
    
    // Then, for each blog post group, sort by position and create thread groups
    const threadGroups: Tweet[][] = []
    
    Object.values(blogPostGroups).forEach(blogPostTweets => {
      // Sort by position
      blogPostTweets.sort((a, b) => {
        if (a.position === null && b.position === null) return 0
        if (a.position === null) return 1
        if (b.position === null) return -1
        return a.position - b.position
      })
      
      // If there's only one tweet or position is null, it's a standalone tweet
      if (blogPostTweets.length === 1 || blogPostTweets[0].position === null) {
        blogPostTweets.forEach(tweet => threadGroups.push([tweet]))
      } else {
        // Otherwise, it's a thread
        threadGroups.push(blogPostTweets)
      }
    })
    
    return threadGroups
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
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
      case "posting":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Posting
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

  const handlePostTweet = async (tweetId: number) => {
    if (postingTweetIds.includes(tweetId)) return
    
    setPostingTweetIds(prev => [...prev, tweetId])
    
    try {
      const result = await postTweet(tweetId)
      
      if (result.success) {
        toast({
          title: "Tweet posting started",
          description: "The tweet is being posted. It may take a moment to complete.",
        })
        
        // Refresh the list after a short delay
        setTimeout(() => {
          setRefreshKey(prev => prev + 1)
        }, 2000)
      } else {
        toast({
          title: "Failed to post tweet",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while posting the tweet",
        variant: "destructive",
      })
    } finally {
      setPostingTweetIds(prev => prev.filter(id => id !== tweetId))
    }
  }

  const handlePostThread = async (threadIds: number[]) => {
    if (threadIds.some(id => postingTweetIds.includes(id))) return
    
    setPostingTweetIds(prev => [...prev, ...threadIds])
    
    try {
      const result = await postThread(threadIds)
      
      if (result.success) {
        toast({
          title: "Thread posting started",
          description: "The thread is being posted. It may take a moment to complete.",
        })
        
        // Refresh the list after a short delay
        setTimeout(() => {
          setRefreshKey(prev => prev + 1)
        }, 2000)
      } else {
        toast({
          title: "Failed to post thread",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while posting the thread",
        variant: "destructive",
      })
    } finally {
      setPostingTweetIds(prev => prev.filter(id => !threadIds.includes(id)))
    }
  }
  
  const handleDeleteClick = (tweet: Tweet) => {
    setTweetToDelete(tweet)
    setDeleteDialogOpen(true)
  }
  
  const handleDeleteConfirm = async () => {
    if (!tweetToDelete) return
    
    const tweetId = tweetToDelete.id
    setDeletingTweetIds(prev => [...prev, tweetId])
    setDeleteDialogOpen(false)
    
    try {
      const result = await deleteTweet(tweetId)
      
      if (result.success) {
        toast({
          title: "Tweet deleted",
          description: "The tweet has been deleted successfully.",
        })
        
        // Refresh the list
        setRefreshKey(prev => prev + 1)
      } else {
        toast({
          title: "Failed to delete tweet",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while deleting the tweet",
        variant: "destructive",
      })
    } finally {
      setDeletingTweetIds(prev => prev.filter(id => id !== tweetId))
      setTweetToDelete(null)
    }
  }
  
  const handleEditClick = (tweet: Tweet) => {
    setTweetToEdit(tweet)
    setEditedContent(tweet.content)
    setEditDialogOpen(true)
  }
  
  const handleEditConfirm = async () => {
    if (!tweetToEdit) return
    
    const tweetId = tweetToEdit.id
    setUpdatingTweetIds(prev => [...prev, tweetId])
    setEditDialogOpen(false)
    
    try {
      const result = await updateTweet(tweetId, editedContent)
      
      if (result.success) {
        toast({
          title: "Tweet updated",
          description: "The tweet has been updated successfully.",
        })
        
        // Refresh the list
        setRefreshKey(prev => prev + 1)
      } else {
        toast({
          title: "Failed to update tweet",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the tweet",
        variant: "destructive",
      })
    } finally {
      setUpdatingTweetIds(prev => prev.filter(id => id !== tweetId))
      setTweetToEdit(null)
    }
  }

  const groupedTweets = tweets ? groupTweets(tweets) : []

  return (
    <>
      <DataState
        isLoading={isLoading}
        error={error ? { message: 'Error loading tweets', details: error.message } : null}
        data={tweets}
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
            <h3 className="font-medium mb-2">Failed to load tweets</h3>
            <p className="text-sm mb-3">{error?.message}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        }
      >
        {(tweets) => (
          <div className="space-y-6">
            {groupedTweets.length === 0 && (
              <div className="text-center p-6 border rounded-lg">
                <p className="text-muted-foreground">No tweets found</p>
              </div>
            )}
            
            {groupedTweets.map((group, groupIndex) => {
              const isThread = group.length > 1
              const threadIds = group.map(tweet => tweet.id)
              const allPosted = group.every(tweet => tweet.status === 'posted')
              const anyPosting = group.some(tweet => tweet.status === 'posting' || postingTweetIds.includes(tweet.id))
              
              return (
                <div key={groupIndex} className="space-y-2 rounded-lg border p-4">
                  {isThread && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Thread ({group.length} tweets)</span>
                        <span className="text-xs text-muted-foreground">
                          Blog #{group[0].blog_post_id}
                        </span>
                      </div>
                      
                      {!allPosted && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePostThread(threadIds)}
                          disabled={anyPosting}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {anyPosting ? 'Posting...' : 'Post Thread'}
                        </Button>
                      )}
                    </div>
                  )}

                  {group.map((tweet, tweetIndex) => {
                    const isPosting = tweet.status === 'posting' || postingTweetIds.includes(tweet.id)
                    
                    return (
                      <div
                        key={tweet.id}
                        className={`flex items-start justify-between p-3 ${isThread ? "border-l-2 ml-2 pl-4" : ""}`}
                      >
                        <div className="grid gap-1 flex-1">
                          {isThread && (
                            <div className="text-xs text-muted-foreground">
                              Tweet {tweet.position} of {group.length}
                            </div>
                          )}
                          <div className="text-sm">{tweet.content}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {getStatusBadge(isPosting ? 'posting' : tweet.status)}
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {tweet.status === 'posted' 
                                ? formatDate(tweet.posted_at) 
                                : formatDate(tweet.scheduled_for)}
                            </div>
                            {!isThread && (
                              <span className="text-xs text-muted-foreground">
                                {tweet.blog_post_id ? `Blog #${tweet.blog_post_id}` : 'Direct'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {tweet.status === 'posted' ? (
                            <Button variant="outline" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : !isThread ? (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handlePostTweet(tweet.id)}
                              disabled={isPosting}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleEditClick(tweet)}
                              disabled={tweet.status === 'posted' || updatingTweetIds.includes(tweet.id)}
                            >
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
                              {tweet.status !== 'posted' && !isThread && (
                                <DropdownMenuItem onClick={() => handlePostTweet(tweet.id)} disabled={isPosting}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Post Now
                                </DropdownMenuItem>
                              )}
                              {tweet.status === 'scheduled' && (
                                <DropdownMenuItem>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Reschedule
                                </DropdownMenuItem>
                              )}
                              {tweet.status !== 'posted' && (
                                <DropdownMenuItem 
                                  onClick={() => handleEditClick(tweet)}
                                  disabled={updatingTweetIds.includes(tweet.id)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  {updatingTweetIds.includes(tweet.id) ? 'Updating...' : 'Edit'}
                                </DropdownMenuItem>
                              )}
                              {tweet.status === 'posted' && (
                                <DropdownMenuItem>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View on X
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteClick(tweet)}
                                disabled={tweet.status === 'posted' || deletingTweetIds.includes(tweet.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingTweetIds.includes(tweet.id) ? 'Deleting...' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </DataState>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this tweet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The tweet will be permanently deleted from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tweet</DialogTitle>
            <DialogDescription>
              Update the content of this tweet. It will remain in scheduled status until posted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Tweet content"
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditConfirm} 
              disabled={!editedContent.trim() || editedContent === tweetToEdit?.content}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
