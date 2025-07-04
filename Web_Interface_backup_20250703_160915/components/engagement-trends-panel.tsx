"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data - would be fetched from API in real implementation
const mockTrendData = {
  daily: [
    { date: "Jun 1", ai: 82, web: 75, cyber: 90, blockchain: 62, cloud: 78 },
    { date: "Jun 2", ai: 85, web: 73, cyber: 88, blockchain: 65, cloud: 80 },
    { date: "Jun 3", ai: 83, web: 76, cyber: 91, blockchain: 63, cloud: 79 },
    { date: "Jun 4", ai: 86, web: 78, cyber: 89, blockchain: 64, cloud: 81 },
    { date: "Jun 5", ai: 84, web: 77, cyber: 92, blockchain: 66, cloud: 80 },
    { date: "Jun 6", ai: 87, web: 76, cyber: 90, blockchain: 65, cloud: 82 },
    { date: "Jun 7", ai: 85, web: 78, cyber: 93, blockchain: 64, cloud: 80 },
    { date: "Jun 8", ai: 88, web: 77, cyber: 91, blockchain: 63, cloud: 81 },
    { date: "Jun 9", ai: 86, web: 79, cyber: 92, blockchain: 65, cloud: 83 },
    { date: "Jun 10", ai: 85, web: 78, cyber: 94, blockchain: 64, cloud: 82 },
  ],
  weekly: [
    { date: "Week 1", ai: 83, web: 75, cyber: 89, blockchain: 63, cloud: 79 },
    { date: "Week 2", ai: 85, web: 76, cyber: 90, blockchain: 64, cloud: 80 },
    { date: "Week 3", ai: 84, web: 77, cyber: 91, blockchain: 65, cloud: 81 },
    { date: "Week 4", ai: 86, web: 78, cyber: 92, blockchain: 64, cloud: 82 },
    { date: "Week 5", ai: 85, web: 77, cyber: 93, blockchain: 65, cloud: 81 },
    { date: "Week 6", ai: 87, web: 79, cyber: 92, blockchain: 66, cloud: 83 },
    { date: "Week 7", ai: 86, web: 78, cyber: 94, blockchain: 65, cloud: 82 },
    { date: "Week 8", ai: 88, web: 80, cyber: 93, blockchain: 67, cloud: 84 },
  ],
  monthly: [
    { date: "Jan", ai: 80, web: 72, cyber: 85, blockchain: 60, cloud: 75 },
    { date: "Feb", ai: 82, web: 74, cyber: 87, blockchain: 62, cloud: 77 },
    { date: "Mar", ai: 83, web: 75, cyber: 89, blockchain: 63, cloud: 78 },
    { date: "Apr", ai: 84, web: 76, cyber: 90, blockchain: 64, cloud: 79 },
    { date: "May", ai: 85, web: 77, cyber: 91, blockchain: 65, cloud: 80 },
    { date: "Jun", ai: 87, web: 78, cyber: 93, blockchain: 66, cloud: 82 },
  ],
}

// Mock topic colors for the chart
const topicColors = {
  ai: "#3b82f6", // blue
  web: "#10b981", // green
  cyber: "#ef4444", // red
  blockchain: "#f59e0b", // amber
  cloud: "#8b5cf6", // purple
}

export function EngagementTrendsPanel() {
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["ai", "cyber", "cloud"])
  
  // This would be a real chart component in a production implementation
  // For this example, we'll create a simple visual representation
  const renderChart = () => {
    const data = mockTrendData[timeRange]
    const maxValue = 100 // Fixed max for simplicity
    
    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px] h-[300px] relative mt-6">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-muted-foreground">
            <div>100</div>
            <div>75</div>
            <div>50</div>
            <div>25</div>
            <div>0</div>
          </div>
          
          {/* Chart area */}
          <div className="absolute left-10 right-0 top-0 bottom-0 border-l border-b">
            {/* Horizontal grid lines */}
            <div className="absolute left-0 right-0 top-0 h-px bg-muted"></div>
            <div className="absolute left-0 right-0 top-1/4 h-px bg-muted"></div>
            <div className="absolute left-0 right-0 top-2/4 h-px bg-muted"></div>
            <div className="absolute left-0 right-0 top-3/4 h-px bg-muted"></div>
            <div className="absolute left-0 right-0 bottom-0 h-px bg-muted"></div>
            
            {/* Data lines */}
            {selectedTopics.map(topic => (
              <svg key={topic} className="absolute inset-0 overflow-visible" preserveAspectRatio="none">
                <polyline
                  points={data.map((item, i) => {
                    const x = (i / (data.length - 1)) * 100
                    const y = 100 - (item[topic as keyof typeof item] / maxValue) * 100
                    return `${x}% ${y}%`
                  }).join(' ')}
                  fill="none"
                  stroke={topicColors[topic as keyof typeof topicColors]}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                {data.map((item, i) => {
                  const x = (i / (data.length - 1)) * 100
                  const y = 100 - (item[topic as keyof typeof item] / maxValue) * 100
                  return (
                    <circle
                      key={i}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="3"
                      fill={topicColors[topic as keyof typeof topicColors]}
                    />
                  )
                })}
              </svg>
            ))}
            
            {/* X-axis labels */}
            <div className="absolute left-0 right-0 bottom-[-20px] flex justify-between text-xs text-muted-foreground">
              {data.map((item, i) => (
                <div key={i} className="text-center" style={{ width: `${100 / data.length}%` }}>
                  {item.date}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeRange">Time Range</Label>
          <Select
            value={timeRange}
            onValueChange={(value: "daily" | "weekly" | "monthly") => setTimeRange(value)}
          >
            <SelectTrigger id="timeRange" className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Topics</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(topicColors).map(([topic, color]) => (
              <button
                key={topic}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTopics.includes(topic)
                    ? 'text-white'
                    : 'text-muted-foreground bg-muted/50 hover:bg-muted'
                }`}
                style={{ backgroundColor: selectedTopics.includes(topic) ? color : undefined }}
                onClick={() => handleTopicToggle(topic)}
              >
                {topic === 'ai' ? 'AI' : 
                 topic === 'web' ? 'Web Dev' : 
                 topic === 'cyber' ? 'Cybersecurity' : 
                 topic === 'blockchain' ? 'Blockchain' : 'Cloud'}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="line">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Engagement Score Trends</h3>
              <TabsList>
                <TabsTrigger value="line">Line</TabsTrigger>
                <TabsTrigger value="bar">Bar</TabsTrigger>
                <TabsTrigger value="area">Area</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="line" className="mt-0">
              {renderChart()}
            </TabsContent>
            <TabsContent value="bar" className="mt-0">
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Bar chart visualization will be implemented in a future update.
              </div>
            </TabsContent>
            <TabsContent value="area" className="mt-0">
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Area chart visualization will be implemented in a future update.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>Note: This chart shows engagement score trends over time. Higher scores indicate topics with greater audience engagement.</p>
      </div>
    </div>
  )
}
