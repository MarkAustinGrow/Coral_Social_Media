"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, ArrowUpDown, Trash2 } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockTopics = [
  {
    id: 1,
    name: "Artificial Intelligence",
    score: 85,
    active: true,
    lastUpdated: "2025-06-08T14:30:00Z",
    trend: "up",
    relatedTopics: ["Machine Learning", "Neural Networks", "AI Ethics"]
  },
  {
    id: 2,
    name: "Web Development",
    score: 78,
    active: true,
    lastUpdated: "2025-06-09T10:15:00Z",
    trend: "stable",
    relatedTopics: ["JavaScript", "React", "CSS"]
  },
  {
    id: 3,
    name: "Cybersecurity",
    score: 92,
    active: true,
    lastUpdated: "2025-06-10T08:45:00Z",
    trend: "up",
    relatedTopics: ["Data Privacy", "Network Security", "Encryption"]
  },
  {
    id: 4,
    name: "Blockchain",
    score: 65,
    active: true,
    lastUpdated: "2025-06-07T16:20:00Z",
    trend: "down",
    relatedTopics: ["Cryptocurrency", "Smart Contracts", "DeFi"]
  },
  {
    id: 5,
    name: "Cloud Computing",
    score: 80,
    active: true,
    lastUpdated: "2025-06-06T11:30:00Z",
    trend: "up",
    relatedTopics: ["AWS", "Azure", "Serverless"]
  },
  {
    id: 6,
    name: "DevOps",
    score: 72,
    active: true,
    lastUpdated: "2025-06-05T09:15:00Z",
    trend: "stable",
    relatedTopics: ["CI/CD", "Docker", "Kubernetes"]
  },
  {
    id: 7,
    name: "Data Science",
    score: 88,
    active: true,
    lastUpdated: "2025-06-04T13:45:00Z",
    trend: "up",
    relatedTopics: ["Big Data", "Data Visualization", "Statistics"]
  },
  {
    id: 8,
    name: "Mobile Development",
    score: 70,
    active: true,
    lastUpdated: "2025-06-03T15:30:00Z",
    trend: "down",
    relatedTopics: ["iOS", "Android", "React Native"]
  },
  {
    id: 9,
    name: "Internet of Things",
    score: 68,
    active: false,
    lastUpdated: "2025-06-02T10:00:00Z",
    trend: "down",
    relatedTopics: ["Embedded Systems", "Sensors", "Smart Devices"]
  },
  {
    id: 10,
    name: "Augmented Reality",
    score: 75,
    active: true,
    lastUpdated: "2025-06-01T14:15:00Z",
    trend: "up",
    relatedTopics: ["Virtual Reality", "Mixed Reality", "Spatial Computing"]
  },
]

export function EngagementMetricsPanel() {
  const [topics, setTopics] = useState(mockTopics)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "score">("score")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [newTopic, setNewTopic] = useState("")
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }
  
  const handleScoreChange = (id: number, value: number[]) => {
    setTopics(prev => 
      prev.map(topic => 
        topic.id === id ? { ...topic, score: value[0] } : topic
      )
    )
  }
  
  const handleActiveChange = (id: number, checked: boolean) => {
    setTopics(prev => 
      prev.map(topic => 
        topic.id === id ? { ...topic, active: checked } : topic
      )
    )
  }
  
  const handleSort = (by: "name" | "score") => {
    if (sortBy === by) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(by)
      setSortDirection(by === "name" ? "asc" : "desc")
    }
  }
  
  const handleAddTopic = () => {
    if (newTopic.trim() !== "") {
      const newId = Math.max(...topics.map(t => t.id)) + 1
      setTopics(prev => [
        ...prev,
        {
          id: newId,
          name: newTopic.trim(),
          score: 50,
          active: true,
          lastUpdated: new Date().toISOString(),
          trend: "stable",
          relatedTopics: []
        }
      ])
      setNewTopic("")
    }
  }
  
  const handleDeleteTopic = (id: number) => {
    setTopics(prev => prev.filter(topic => topic.id !== id))
  }
  
  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case "up":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Trending Up
          </Badge>
        )
      case "down":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Trending Down
          </Badge>
        )
      case "stable":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Stable
          </Badge>
        )
      default:
        return null
    }
  }
  
  const filteredTopics = topics
    .filter(topic => 
      topic.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortDirection === "asc" 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      } else {
        return sortDirection === "asc" 
          ? a.score - b.score
          : b.score - a.score
      }
    })
  
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
          <Button variant="outline" size="sm" onClick={() => handleSort("name")}>
            Name
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSort("score")}>
            Score
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredTopics.map((topic) => (
          <div key={topic.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{topic.name}</h3>
                {getTrendBadge(topic.trend)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Updated: {formatDateTime(topic.lastUpdated)}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Engagement Score: {topic.score}</Label>
                  <span className="text-sm text-muted-foreground">
                    {topic.score < 30 ? "Low" : topic.score > 70 ? "High" : "Medium"}
                  </span>
                </div>
                <Slider
                  defaultValue={[topic.score]}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleScoreChange(topic.id, value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id={`active-${topic.id}`}
                  checked={topic.active}
                  onCheckedChange={(checked) => handleActiveChange(topic.id, checked)}
                />
                <Label htmlFor={`active-${topic.id}`}>Active</Label>
                <div className="flex-1"></div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {topic.relatedTopics.slice(0, 2).map((relatedTopic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {relatedTopic}
                    </Badge>
                  ))}
                  {topic.relatedTopics.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{topic.relatedTopics.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
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
