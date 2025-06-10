"use client"

import { useState } from "react"
import { CheckCircle, AlertCircle, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FinishStepProps {
  formData: any
  updateFormData: (data: any) => void
}

export function FinishStep({ formData, updateFormData }: FinishStepProps) {
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  
  const toggleDetails = (section: string) => {
    setShowDetails(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  // Check if all required fields are filled
  const apiKeysComplete = formData.openai && formData.twitterBearer
  const databaseComplete = formData.supabaseUrl && formData.supabaseKey
  
  // Count enabled agents
  const enabledAgents = [
    formData.tweetScraping,
    formData.tweetResearch,
    formData.blogWriting,
    formData.blogToTweet,
    formData.xReply,
    formData.twitterPosting
  ].filter(Boolean).length
  
  return (
    <div className="space-y-6">
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Setup Almost Complete</AlertTitle>
        <AlertDescription>
          Review your configuration before finalizing setup.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <Card className={apiKeysComplete ? "border-green-500" : "border-yellow-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {apiKeysComplete ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              API Keys
            </CardTitle>
            <CardDescription>
              {apiKeysComplete 
                ? "All required API keys are configured" 
                : "Some required API keys are missing"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  {apiKeysComplete 
                    ? "Your system will be able to connect to all required services." 
                    : "You may need to add missing API keys later."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("apiKeys")}
              >
                {showDetails.apiKeys ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.apiKeys ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.apiKeys && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>OpenAI API Key</span>
                  <span>{formData.openai ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Twitter Bearer Token</span>
                  <span>{formData.twitterBearer ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Twitter API Credentials</span>
                  <span>{formData.twitterApiKey && formData.twitterApiSecret ? "✓ Configured" : "⚠ Partial"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supabase Credentials</span>
                  <span>{formData.supabaseUrl && formData.supabaseKey ? "✓ Configured" : "✗ Missing"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className={databaseComplete ? "border-green-500" : "border-yellow-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {databaseComplete ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Database Configuration
            </CardTitle>
            <CardDescription>
              {databaseComplete 
                ? "Database connection is configured" 
                : "Database configuration is incomplete"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  {databaseComplete 
                    ? "Your system will store data in Supabase." 
                    : "You need to configure your database connection."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("database")}
              >
                {showDetails.database ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.database ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.database && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Supabase URL</span>
                  <span>{formData.supabaseUrl ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supabase API Key</span>
                  <span>{formData.supabaseKey ? "✓ Configured" : "✗ Missing"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection Pooling</span>
                  <span>{formData.enablePooling ? `✓ Enabled (${formData.poolSize})` : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vector Database (Qdrant)</span>
                  <span>{formData.qdrantUrl ? "✓ Configured" : "⚠ Default"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className={enabledAgents > 0 ? "border-green-500" : "border-yellow-500"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {enabledAgents > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Agent Configuration
            </CardTitle>
            <CardDescription>
              {enabledAgents > 0 
                ? `${enabledAgents} agents enabled` 
                : "No agents enabled"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  {enabledAgents > 0 
                    ? `Your system will run with ${enabledAgents} active agents.` 
                    : "You need to enable at least one agent."}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("agents")}
              >
                {showDetails.agents ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.agents ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.agents && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tweet Scraping Agent</span>
                  <span>{formData.tweetScraping ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tweet Research Agent</span>
                  <span>{formData.tweetResearch ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blog Writing Agent</span>
                  <span>{formData.blogWriting ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blog to Tweet Agent</span>
                  <span>{formData.blogToTweet ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>X Reply Agent</span>
                  <span>{formData.xReply ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Twitter Posting Agent</span>
                  <span>{formData.twitterPosting ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Concurrent Agents</span>
                  <span>{formData.maxConcurrentAgents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-restart Failed Agents</span>
                  <span>{formData.enableAutoRestart ? "✓ Enabled" : "✗ Disabled"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Persona Configuration
            </CardTitle>
            <CardDescription>
              Persona "{formData.name}" configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm">
                  Your system will use the configured persona for content generation.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails("persona")}
              >
                {showDetails.persona ? "Hide Details" : "Show Details"}
                <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${showDetails.persona ? "rotate-90" : ""}`} />
              </Button>
            </div>
            
            {showDetails.persona && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span>{formData.name}</span>
                </div>
                <div>
                  <span>Description</span>
                  <p className="mt-1 text-muted-foreground">{formData.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex justify-between">
                    <span>Formality</span>
                    <span>{formData.tone}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humor</span>
                    <span>{formData.humor}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enthusiasm</span>
                    <span>{formData.enthusiasm}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assertiveness</span>
                    <span>{formData.assertiveness}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Alert variant={apiKeysComplete && databaseComplete && enabledAgents > 0 ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {apiKeysComplete && databaseComplete && enabledAgents > 0 
            ? "Ready to Complete Setup" 
            : "Configuration Incomplete"}
        </AlertTitle>
        <AlertDescription>
          {apiKeysComplete && databaseComplete && enabledAgents > 0 
            ? "Click 'Complete Setup' to finalize your configuration and start using the system." 
            : "Some required configuration is missing. You can still proceed, but you'll need to complete the configuration later."}
        </AlertDescription>
      </Alert>
    </div>
  )
}
