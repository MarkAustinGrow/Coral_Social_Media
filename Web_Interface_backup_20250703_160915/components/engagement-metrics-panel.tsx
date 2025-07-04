"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DataState } from "@/components/ui/data-state"
import { useTopicsData, Topic } from "@/hooks/use-topics-data"
import { Search, Plus, ArrowUpDown, Trash2, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"


export function EngagementMetricsPanel() {
  const { data, isLoading, error, refreshTopics, addTopic, updateTopicStatus, deleteTopic } = useTopicsData()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"topic" | "engagement_score">("engagement_score")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [newTopic, setNewTopic] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }
  
  const handleActiveChange = async (id: number, checked: boolean) => {
    try {
      const result = await updateTopicStatus(id, checked)
      if (result) {
        toast({
          title: "Topic updated",
          description: `Topic has been ${checked ? 'activated' : 'deactivated'}.`,
        })
      } else {
        toast({
          title: "Error updating topic",
          description: "Failed to update topic status. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating topic status:", error)
      toast({
        title: "Error updating topic",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  const handleSort = (by: "topic" | "engagement_score") => {
    if (sortBy === by) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(by)
      setSortDirection(by === "topic" ? "asc" : "desc")
    }
  }
  
  const handleAddTopic = async () => {
    if (newTopic.trim() !== "") {
      try {
        const result = await addTopic({
          topic: newTopic.trim(),
          topic_description: "",
          subtopics: [],
          category: ""
        })
        
        if (result) {
          toast({
            title: "Topic added",
            description: `"${newTopic.trim()}" has been added to topics.`,
          })
          setNewTopic("")
        } else {
          toast({
            title: "Error adding topic",
            description: "Failed to add topic. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error adding topic:", error)
        toast({
          title: "Error adding topic",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      }
    }
  }
  
  const handleDeleteTopic = async (id: number) => {
    try {
      const success = await deleteTopic(id)
      
      if (success) {
        toast({
          title: "Topic deleted",
          description: "The topic has been deleted successfully.",
        })
      } else {
        toast({
          title: "Error deleting topic",
          description: "Failed to delete topic. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting topic:", error)
      toast({
        title: "Error deleting topic",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Category badge for visual distinction
  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        {category}
      </Badge>
    )
  }
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshTopics()
    setIsRefreshing(false)
    toast({
      title: "Data refreshed",
      description: "Topic data has been refreshed.",
    })
  }
  
  const getFilteredTopics = (topics: Topic[]) => {
    return topics
      .filter(topic => 
        topic.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "topic") {
          return sortDirection === "asc" 
            ? a.topic.localeCompare(b.topic)
            : b.topic.localeCompare(a.topic)
        } else {
          return sortDirection === "asc" 
            ? a.engagement_score - b.engagement_score
            : b.engagement_score - a.engagement_score
        }
      })
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search topics..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSort("topic")}>
            Topic
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSort("engagement_score")}>
            Score
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <DataState
        isLoading={isLoading}
        error={error}
        data={data}
        onRetry={refreshTopics}
      >
        {(topics) => (
          <div className="space-y-4">
            {getFilteredTopics(topics).map((topic) => (
              <div key={topic.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{topic.topic}</h3>
                    {getCategoryBadge(topic.category)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Updated: {formatDateTime(topic.last_updated)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteTopic(topic.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {topic.topic_description && (
                  <p className="text-sm text-muted-foreground mb-3">{topic.topic_description}</p>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Engagement Score: {topic.engagement_score}</Label>
                      <span className="text-sm text-muted-foreground">
                        {topic.engagement_score < 30 ? "Low" : topic.engagement_score > 70 ? "High" : "Medium"}
                      </span>
                    </div>
                    {topic.last_used_at && (
                      <div className="text-xs text-muted-foreground">
                        Last Used: {formatDateTime(topic.last_used_at)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-${topic.id}`}
                      checked={topic.is_active}
                      onCheckedChange={(checked) => handleActiveChange(topic.id, checked)}
                    />
                    <Label htmlFor={`active-${topic.id}`}>Active</Label>
                    <div className="flex-1"></div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {topic.subtopics && topic.subtopics.length > 0 && topic.subtopics.map((subtopic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {subtopic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>
      
      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Add new topic..."
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
        />
        <Button onClick={handleAddTopic}>
          <Plus className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
      </div>
    </div>
  )
}
