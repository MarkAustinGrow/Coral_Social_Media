"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Twitter, 
  Search, 
  FileText, 
  MessageSquare, 
  Send, 
  Settings, 
  RefreshCw,
  Clock
} from "lucide-react"

interface AgentConfigStepProps {
  formData: {
    tweetScraping: boolean
    tweetResearch: boolean
    blogWriting: boolean
    blogToTweet: boolean
    xReply: boolean
    twitterPosting: boolean
    maxConcurrentAgents: number
    enableAutoRestart: boolean
  }
  updateFormData: (data: any) => void
}

export function AgentConfigStep({ formData, updateFormData }: AgentConfigStepProps) {
  const [activeTab, setActiveTab] = useState("agents")
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    updateFormData({ [name]: checked })
  }
  
  const handleSliderChange = (value: number[]) => {
    updateFormData({ maxConcurrentAgents: value[0] })
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="agents" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agents">Agent Selection</TabsTrigger>
          <TabsTrigger value="settings">Agent Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className={formData.tweetScraping ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Twitter className="h-4 w-4" />
                  Tweet Scraping Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">Collects tweets from specified accounts and hashtags</p>
                  </div>
                  <Switch
                    checked={formData.tweetScraping}
                    onCheckedChange={(checked) => handleSwitchChange("tweetScraping", checked)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className={formData.tweetResearch ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Tweet Research Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">Analyzes tweets to extract insights and patterns</p>
                  </div>
                  <Switch
                    checked={formData.tweetResearch}
                    onCheckedChange={(checked) => handleSwitchChange("tweetResearch", checked)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className={formData.blogWriting ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Blog Writing Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">Creates blog posts based on tweet insights</p>
                  </div>
                  <Switch
                    checked={formData.blogWriting}
                    onCheckedChange={(checked) => handleSwitchChange("blogWriting", checked)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className={formData.blogToTweet ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Twitter className="h-4 w-4" />
                  Blog to Tweet Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">Converts blog posts into tweet threads</p>
                  </div>
                  <Switch
                    checked={formData.blogToTweet}
                    onCheckedChange={(checked) => handleSwitchChange("blogToTweet", checked)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className={formData.xReply ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  X Reply Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">Generates replies to tweets and mentions</p>
                  </div>
                  <Switch
                    checked={formData.xReply}
                    onCheckedChange={(checked) => handleSwitchChange("xReply", checked)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className={formData.twitterPosting ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="h-4 w-4" />
                  Twitter Posting Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">Schedules and posts tweets and threads</p>
                  </div>
                  <Switch
                    checked={formData.twitterPosting}
                    onCheckedChange={(checked) => handleSwitchChange("twitterPosting", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Agent Runtime Settings
              </CardTitle>
              <CardDescription>
                Configure how agents run and interact with each other
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="maxConcurrentAgents">
                      Max Concurrent Agents: {formData.maxConcurrentAgents}
                    </Label>
                  </div>
                  <Slider
                    id="maxConcurrentAgents"
                    min={1}
                    max={10}
                    step={1}
                    value={[formData.maxConcurrentAgents]}
                    onValueChange={handleSliderChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of agents that can run simultaneously. Higher values use more resources.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="enableAutoRestart"
                    checked={formData.enableAutoRestart}
                    onCheckedChange={(checked) => handleSwitchChange("enableAutoRestart", checked)}
                  />
                  <div className="grid gap-1.5">
                    <Label htmlFor="enableAutoRestart" className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Auto-restart failed agents
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically restart agents that fail or crash
                    </p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <p className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Agent Scheduling
                  </p>
                  <p className="text-xs text-muted-foreground pt-1">
                    Agents will run based on their dependencies. For example, the Tweet Research Agent will wait for the Tweet Scraping Agent to complete before running.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
