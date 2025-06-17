"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockSuggestions = {
  trending: [
    {
      id: 1,
      topic: "Generative AI for Content Creation",
      confidence: 92,
      reason: "High engagement on related topics and growing search volume",
      relatedTopics: ["AI", "Content Creation", "Automation"],
      sources: ["Twitter Trends", "Search Volume", "Industry Reports"]
    },
    {
      id: 2,
      topic: "Zero-Trust Security Models",
      confidence: 87,
      reason: "Recent high-profile breaches have increased interest in this approach",
      relatedTopics: ["Cybersecurity", "Enterprise Security", "Network Security"],
      sources: ["Industry Reports", "News Analysis", "Forum Activity"]
    },
    {
      id: 3,
      topic: "Serverless Edge Computing",
      confidence: 84,
      reason: "Growing adoption among developers and positive sentiment",
      relatedTopics: ["Cloud Computing", "Edge Computing", "Serverless"],
      sources: ["Developer Forums", "GitHub Activity", "Conference Mentions"]
    },
    {
      id: 4,
      topic: "Web3 Development Frameworks",
      confidence: 78,
      reason: "Increasing developer interest despite market volatility",
      relatedTopics: ["Blockchain", "Web3", "DApps"],
      sources: ["GitHub Activity", "Developer Forums", "Social Media"]
    },
    {
      id: 5,
      topic: "AI Ethics and Regulation",
      confidence: 89,
      reason: "Growing public and regulatory attention to AI governance",
      relatedTopics: ["AI", "Ethics", "Technology Policy"],
      sources: ["News Analysis", "Policy Documents", "Academic Publications"]
    }
  ],
  audience: [
    {
      id: 6,
      topic: "Low-Code AI Application Development",
      confidence: 91,
      reason: "Your audience shows high engagement with both AI and development tools",
      relatedTopics: ["AI", "Development Tools", "Low-Code"],
      sources: ["Audience Engagement", "Profile Analysis", "Content Performance"]
    },
    {
      id: 7,
      topic: "DevSecOps Best Practices",
      confidence: 86,
      reason: "Strong overlap between your audience's security and development interests",
      relatedTopics: ["DevOps", "Security", "CI/CD"],
      sources: ["Audience Profiles", "Content Performance", "Keyword Analysis"]
    },
    {
      id: 8,
      topic: "Practical Machine Learning for Developers",
      confidence: 88,
      reason: "Your audience seeks practical ML implementation guidance",
      relatedTopics: ["Machine Learning", "Software Development", "Tutorials"],
      sources: ["Search Queries", "Content Performance", "Audience Feedback"]
    },
    {
      id: 9,
      topic: "Cloud Cost Optimization Strategies",
      confidence: 83,
      reason: "Economic concerns are driving interest in cloud efficiency",
      relatedTopics: ["Cloud Computing", "Cost Management", "Architecture"],
      sources: ["Audience Engagement", "Industry Trends", "Keyword Analysis"]
    },
    {
      id: 10,
      topic: "API-First Development Approaches",
      confidence: 85,
      reason: "Strong correlation with your audience's integration interests",
      relatedTopics: ["APIs", "Integration", "Microservices"],
      sources: ["Content Performance", "Audience Profiles", "Industry Trends"]
    }
  ],
  gaps: [
    {
      id: 11,
      topic: "Quantum Computing for Software Developers",
      confidence: 79,
      reason: "Growing interest but limited accessible content for developers",
      relatedTopics: ["Quantum Computing", "Software Development", "Future Tech"],
      sources: ["Content Gap Analysis", "Search Trends", "Competitor Analysis"]
    },
    {
      id: 12,
      topic: "Sustainable Technology Practices",
      confidence: 82,
      reason: "Increasing focus on environmental impact of technology",
      relatedTopics: ["Green Tech", "Sustainability", "Corporate Responsibility"],
      sources: ["Trend Analysis", "Content Gap Analysis", "Industry Reports"]
    },
    {
      id: 13,
      topic: "AR/VR Development for Web Platforms",
      confidence: 77,
      reason: "WebXR adoption is growing but content is limited",
      relatedTopics: ["AR/VR", "Web Development", "Immersive Tech"],
      sources: ["Technology Adoption", "Content Gap Analysis", "Developer Interest"]
    },
    {
      id: 14,
      topic: "Privacy-Preserving AI Techniques",
      confidence: 85,
      reason: "Intersection of privacy concerns and AI adoption",
      relatedTopics: ["AI", "Privacy", "Data Protection"],
      sources: ["Regulatory Trends", "Content Gap Analysis", "Research Publications"]
    },
    {
      id: 15,
      topic: "Embedded AI for IoT Devices",
      confidence: 81,
      reason: "Growing IoT market with increasing AI capabilities at the edge",
      relatedTopics: ["IoT", "Edge AI", "Embedded Systems"],
      sources: ["Market Analysis", "Content Gap Analysis", "Technology Trends"]
    }
  ]
}

export function TopicSuggestionsPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [savedTopics, setSavedTopics] = useState<number[]>([])
  const [dismissedTopics, setDismissedTopics] = useState<number[]>([])
  
  const handleRefresh = () => {
    setIsRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }
  
  const handleSaveTopic = (id: number) => {
    setSavedTopics(prev => [...prev, id])
    setDismissedTopics(prev => prev.filter(topicId => topicId !== id))
  }
  
  const handleDismissTopic = (id: number) => {
    setDismissedTopics(prev => [...prev, id])
    setSavedTopics(prev => prev.filter(topicId => topicId !== id))
  }
  
  const renderSuggestionCard = (suggestion: any) => {
    const isSaved = savedTopics.includes(suggestion.id)
    const isDismissed = dismissedTopics.includes(suggestion.id)
    
    if (isDismissed) return null
    
    return (
      <Card key={suggestion.id} className={`${isSaved ? 'border-green-500 dark:border-green-700' : ''}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">{suggestion.topic}</h3>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {suggestion.confidence}% Match
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{suggestion.reason}</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {suggestion.relatedTopics.map((topic: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Sources: {suggestion.sources.join(", ")}
            </div>
            <div className="flex gap-2">
              {!isSaved ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleSaveTopic(suggestion.id)}
                >
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Save
                </Button>
              ) : (
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Saved
                </Badge>
              )}
              {!isDismissed && !isSaved && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-muted-foreground"
                  onClick={() => handleDismissTopic(suggestion.id)}
                >
                  <ThumbsDown className="mr-1 h-3 w-3" />
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">AI-Generated Topic Suggestions</h3>
          <p className="text-sm text-muted-foreground">Based on engagement data, audience analysis, and content gaps</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="trending">
        <TabsList>
          <TabsTrigger value="trending">Trending Topics</TabsTrigger>
          <TabsTrigger value="audience">Audience Matches</TabsTrigger>
          <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedTopics.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="trending" className="mt-4 space-y-4">
          {mockSuggestions.trending.map(renderSuggestionCard)}
        </TabsContent>
        <TabsContent value="audience" className="mt-4 space-y-4">
          {mockSuggestions.audience.map(renderSuggestionCard)}
        </TabsContent>
        <TabsContent value="gaps" className="mt-4 space-y-4">
          {mockSuggestions.gaps.map(renderSuggestionCard)}
        </TabsContent>
        <TabsContent value="saved" className="mt-4 space-y-4">
          {savedTopics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No saved topics yet. Save topics you're interested in to see them here.
            </div>
          ) : (
            <>
              {[...mockSuggestions.trending, ...mockSuggestions.audience, ...mockSuggestions.gaps]
                .filter(suggestion => savedTopics.includes(suggestion.id))
                .map(renderSuggestionCard)}
              <div className="flex justify-end">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Selected to Topics
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
