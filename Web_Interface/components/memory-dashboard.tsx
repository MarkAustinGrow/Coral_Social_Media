"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Search, RefreshCw, Download, Trash2, Eye, AlertCircle } from "lucide-react"
import { DatePickerWithRange } from "../components/date-range-picker"
import { DataState } from "@/components/ui/data-state"
import { useToast } from "@/hooks/use-toast"
import { useMemoryData, QdrantMemory, MemoryFilters } from "@/hooks/use-memory-data"
import type { DateRange } from "react-day-picker"

export function MemoryDashboard() {
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<MemoryFilters>({
    topic: "all",
    sentiment: "all",
    persona: "all",
    dateRange: undefined,
  })
  const [selectedMemory, setSelectedMemory] = useState<QdrantMemory | null>(null)
  const [uniqueTopics, setUniqueTopics] = useState<string[]>([])
  const [uniquePersonas, setUniquePersonas] = useState<string[]>([])
  const sentiments = ["positive", "negative", "neutral"]

  const {
    memories,
    isLoading,
    error,
    totalCount,
    queryTime,
    nextPageOffset,
    message,
    searchMemories,
    loadMoreMemories,
    deleteMemory,
    resetFilters,
  } = useMemoryData()

  // Initial search on component mount
  useEffect(() => {
    handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Extract unique values for filter options from results
  useEffect(() => {
    if (memories.length > 0) {
      const topics = Array.from(new Set(memories.flatMap((m) => m.topics)))
      const personas = Array.from(new Set(memories.map((m) => m.persona_name)))
      
      setUniqueTopics(topics)
      setUniquePersonas(personas)
    }
  }, [memories])

  const handleSearch = async () => {
    setSelectedMemory(null)
    await searchMemories(query, filters)
  }

  const handleReset = () => {
    setQuery("")
    setFilters({
      topic: "all",
      sentiment: "all",
      persona: "all",
      dateRange: undefined,
    })
    searchMemories("", {
      topic: "all",
      sentiment: "all",
      persona: "all",
      dateRange: undefined,
    })
  }

  const handleDelete = async (pointId: string) => {
    const success = await deleteMemory(pointId)
    
    if (success) {
      toast({
        title: "Memory deleted",
        description: "The memory has been successfully deleted.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(memories, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `qdrant-memories-${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

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

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Positive
          </Badge>
        )
      case "negative":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Negative
          </Badge>
        )
      case "neutral":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Neutral
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Search through collected research memories and apply filters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Keywords</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search memories..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={filters.topic} onValueChange={(value) => setFilters({ ...filters, topic: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {uniqueTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sentiment</Label>
              <Select value={filters.sentiment} onValueChange={(value) => setFilters({ ...filters, sentiment: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All sentiments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sentiments</SelectItem>
                  {sentiments.map((sentiment) => (
                    <SelectItem key={sentiment} value={sentiment}>
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={filters.persona} onValueChange={(value) => setFilters({ ...filters, persona: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All personas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All personas</SelectItem>
                  {uniquePersonas.map((persona) => (
                    <SelectItem key={persona} value={persona}>
                      {persona}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                setDate={(dateRange: DateRange | undefined) => setFilters({ ...filters, dateRange })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={memories.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export ({memories.length})
            </Button>
            <div className="text-xs text-muted-foreground ml-2">
              {queryTime > 0 ? `Search completed in ${queryTime}ms` : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Research Memories ({totalCount})</CardTitle>
          <CardDescription>
            {query ? `Showing results for "${query}"` : "Enter search criteria above"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 p-4 border rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <p>{message}</p>
            </div>
          )}
          {/* Use a simpler approach without DataState for now */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="mt-4 text-center text-sm text-muted-foreground">Loading data...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading data</AlertTitle>
              <AlertDescription className="mt-2">
                <p>{error.message}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleSearch}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <h3 className="font-medium mb-2">No memories found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or adding more memories through the Tweet Research Agent.
              </p>
              <Button onClick={handleReset} variant="outline">
                Reset Filters
              </Button>
            </div>
          ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Tweet</TableHead>
                      <TableHead className="w-[200px]">Analysis</TableHead>
                      <TableHead>Topics</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memories.map((memory) => (
                      <TableRow key={memory.point_id}>
                        <TableCell className="font-medium">
                          <div className="max-w-[280px] truncate">{memory.tweet_text}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px] truncate text-sm text-muted-foreground">{memory.analysis}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {memory.topics.slice(0, 2).map((topic) => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic.replace(/_/g, " ")}
                              </Badge>
                            ))}
                            {memory.topics.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{memory.topics.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getSentimentBadge(memory.sentiment)}</TableCell>
                        <TableCell className="text-sm">{memory.persona_name}</TableCell>
                        <TableCell className="text-sm">{formatDate(memory.date)}</TableCell>
                        <TableCell className="text-sm font-mono">
                          {typeof memory.confidence_score === 'number' 
                            ? memory.confidence_score.toFixed(2) 
                            : "1.00"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedMemory(memory)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle>Memory Details</DialogTitle>
                                  <DialogDescription>Point ID: {memory.point_id}</DialogDescription>
                                </DialogHeader>
                                {selectedMemory && (
                                  <ScrollArea className="max-h-[60vh]">
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-medium mb-2">Original Tweet</h4>
                                        <p className="text-sm bg-muted p-3 rounded-md">{selectedMemory.tweet_text}</p>
                                      </div>

                                      <Separator />

                                      <div>
                                        <h4 className="font-medium mb-2">Analysis</h4>
                                        <p className="text-sm">{selectedMemory.analysis}</p>
                                      </div>

                                      <Separator />

                                      <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                          <h4 className="font-medium mb-2">Topics</h4>
                                          <div className="flex flex-wrap gap-1">
                                            {selectedMemory.topics.map((topic) => (
                                              <Badge key={topic} variant="secondary">
                                                {topic.replace(/_/g, " ")}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>

                                        <div>
                                          <h4 className="font-medium mb-2">Related Entities</h4>
                                          <div className="flex flex-wrap gap-1">
                                            {selectedMemory.related_entities.map((entity) => (
                                              <Badge key={entity} variant="outline">
                                                {entity}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      <Separator />

                                      <div className="grid gap-4 md:grid-cols-3">
                                        <div>
                                          <h4 className="font-medium mb-2">Sentiment</h4>
                                          {getSentimentBadge(selectedMemory.sentiment)}
                                        </div>

                                        <div>
                                          <h4 className="font-medium mb-2">Persona</h4>
                                          <p className="text-sm">{selectedMemory.persona_name}</p>
                                        </div>

                                        <div>
                                          <h4 className="font-medium mb-2">Confidence Score</h4>
                                          <p className="text-sm font-mono">
                                            {typeof selectedMemory.confidence_score === 'number' 
                                              ? selectedMemory.confidence_score.toFixed(3) 
                                              : "1.000"}
                                          </p>
                                        </div>
                                      </div>

                                      <Separator />

                                      <div>
                                        <h4 className="font-medium mb-2">Metadata</h4>
                                        <div className="grid gap-2 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Author:</span>
                                            <span>{selectedMemory.metadata.author}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Engagement Score:</span>
                                            <span>{selectedMemory.metadata.engagement_score}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Retweets:</span>
                                            <span>{selectedMemory.metadata.retweet_count}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Likes:</span>
                                            <span>{selectedMemory.metadata.like_count}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Date:</span>
                                            <span>{formatDate(selectedMemory.date)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </ScrollArea>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(memory.point_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          )}
          
          {nextPageOffset && (
            <div className="flex justify-center mt-6">
              <Button 
                variant="outline" 
                onClick={() => loadMoreMemories()} 
                disabled={isLoading}
                className="w-full max-w-xs"
              >
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span>Load More</span>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
