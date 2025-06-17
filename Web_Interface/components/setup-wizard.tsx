"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { WelcomeStep } from "@/components/setup-steps/welcome-step"
import { ApiKeysStep } from "@/components/setup-steps/api-keys-step"
import { DatabaseStep } from "@/components/setup-steps/database-step"
import { AgentConfigStep } from "@/components/setup-steps/agent-config-step"
import { PersonaStep } from "@/components/setup-steps/persona-step"
import { FinishStep } from "@/components/setup-steps/finish-step"

const steps = [
  { id: "welcome", title: "Welcome", component: WelcomeStep },
  { id: "api-keys", title: "API Keys", component: ApiKeysStep },
  { id: "database", title: "Database", component: DatabaseStep },
  { id: "agents", title: "Agent Configuration", component: AgentConfigStep },
  { id: "persona", title: "Persona Setup", component: PersonaStep },
  { id: "finish", title: "Finish", component: FinishStep },
]

export function SetupWizard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    apiKeys: {
      openai: "",
      perplexity: "",
      anthropic: "",
      twitter: "",
      twitterBearer: "",
      twitterApiKey: "",
      twitterApiSecret: "",
      twitterAccessToken: "",
      twitterAccessSecret: "",
    },
    database: {
      supabaseUrl: "",
      supabaseKey: "",
      qdrantUrl: "http://localhost:6333",
      qdrantCollection: "tweets",
      enablePooling: true,
      poolSize: 10,
    },
    agents: {
      tweetScraping: true,
      tweetResearch: true,
      blogWriting: true,
      blogToTweet: true,
      xReply: true,
      twitterPosting: true,
      maxConcurrentAgents: 4,
      enableAutoRestart: true,
    },
    persona: {
      name: "Tech Thought Leader",
      description: "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
      tone: 70,
      humor: 40,
      enthusiasm: 65,
      assertiveness: 75,
    }
  })

  const currentStep = steps[currentStepIndex]
  const CurrentStepComponent = currentStep.component
  
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100
  
  const handleNext = async () => {
    // Mark current step as completed
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps([...completedSteps, currentStep.id])
    }
    
    // If this is the last step, submit the form
    if (currentStepIndex === steps.length - 1) {
      setIsSubmitting(true)
      
      try {
        // Save configuration to .env file via API
        const response = await fetch('/api/save-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to save configuration');
        }
        
        console.log("Configuration saved successfully:", result);
        
        // Create a success message element
        const successMessage = document.createElement('div')
        successMessage.style.position = 'fixed'
        successMessage.style.top = '20px'
        successMessage.style.left = '50%'
        successMessage.style.transform = 'translateX(-50%)'
        successMessage.style.backgroundColor = '#10b981'
        successMessage.style.color = 'white'
        successMessage.style.padding = '1rem 2rem'
        successMessage.style.borderRadius = '0.5rem'
        successMessage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
        successMessage.style.zIndex = '9999'
        successMessage.textContent = 'Setup completed successfully! Configuration saved to .env file.'
        
        // Add the success message to the document
        document.body.appendChild(successMessage)
        
        // Remove the success message after a few seconds
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage)
          }
        }, 5000)
      } catch (error) {
        console.error("Error saving configuration:", error)
        
        // Create an error message element
        const errorMessage = document.createElement('div')
        errorMessage.style.position = 'fixed'
        errorMessage.style.top = '20px'
        errorMessage.style.left = '50%'
        errorMessage.style.transform = 'translateX(-50%)'
        errorMessage.style.backgroundColor = '#ef4444'
        errorMessage.style.color = 'white'
        errorMessage.style.padding = '1rem 2rem'
        errorMessage.style.borderRadius = '0.5rem'
        errorMessage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
        errorMessage.style.zIndex = '9999'
        errorMessage.textContent = `Error saving configuration: ${error instanceof Error ? error.message : String(error)}`
        
        // Add the error message to the document
        document.body.appendChild(errorMessage)
        
        // Remove the error message after a few seconds
        setTimeout(() => {
          if (document.body.contains(errorMessage)) {
            document.body.removeChild(errorMessage)
          }
        }, 5000)
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    
    // Otherwise, go to the next step
    setCurrentStepIndex(currentStepIndex + 1)
  }
  
  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }
  
  const updateFormData = (section: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        ...data
      }
    }))
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1 mr-4">
          <Progress value={progress} className="h-2" />
        </div>
        <div className="text-sm font-medium">
          Step {currentStepIndex + 1} of {steps.length}
        </div>
      </div>
      
      <Card className="p-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{currentStep.title}</h2>
            <p className="text-muted-foreground">
              {currentStepIndex === 0 && "Welcome to the setup wizard. Let's get your system configured."}
              {currentStepIndex === 1 && "Configure your API keys for external services."}
              {currentStepIndex === 2 && "Set up your database connections."}
              {currentStepIndex === 3 && "Configure which agents you want to enable."}
              {currentStepIndex === 4 && "Set up your system's persona and tone."}
              {currentStepIndex === 5 && "You're all set! Review your configuration and finish setup."}
            </p>
          </div>
          
          <div className="min-h-[300px]">
            {currentStep.id === "welcome" ? (
              <WelcomeStep 
                formData={formData.apiKeys} 
                updateFormData={(data: any) => updateFormData("apiKeys", data)} 
              />
            ) : currentStep.id === "api-keys" ? (
              <ApiKeysStep 
                formData={formData.apiKeys} 
                updateFormData={(data: any) => updateFormData("apiKeys", data)} 
              />
            ) : currentStep.id === "database" ? (
              <DatabaseStep 
                formData={formData.database} 
                updateFormData={(data: any) => updateFormData("database", data)} 
              />
            ) : currentStep.id === "agents" ? (
              <AgentConfigStep 
                formData={formData.agents} 
                updateFormData={(data: any) => updateFormData("agents", data)} 
              />
            ) : currentStep.id === "persona" ? (
              <PersonaStep 
                formData={formData.persona} 
                updateFormData={(data: any) => updateFormData("persona", data)} 
              />
            ) : (
              <FinishStep 
                formData={{
                  ...formData.apiKeys,
                  ...formData.database,
                  ...formData.agents,
                  ...formData.persona
                }} 
                updateFormData={(data: any) => {
                  // Determine which section each field belongs to
                  const apiKeysData: any = {};
                  const databaseData: any = {};
                  const agentsData: any = {};
                  const personaData: any = {};
                  
                  // API Keys fields
                  if ('openai' in data) apiKeysData.openai = data.openai;
                  if ('perplexity' in data) apiKeysData.perplexity = data.perplexity;
                  if ('anthropic' in data) apiKeysData.anthropic = data.anthropic;
                  if ('twitter' in data) apiKeysData.twitter = data.twitter;
                  if ('twitterBearer' in data) apiKeysData.twitterBearer = data.twitterBearer;
                  if ('twitterApiKey' in data) apiKeysData.twitterApiKey = data.twitterApiKey;
                  if ('twitterApiSecret' in data) apiKeysData.twitterApiSecret = data.twitterApiSecret;
                  if ('twitterAccessToken' in data) apiKeysData.twitterAccessToken = data.twitterAccessToken;
                  if ('twitterAccessSecret' in data) apiKeysData.twitterAccessSecret = data.twitterAccessSecret;
                  
                  // Database fields
                  if ('supabaseUrl' in data) databaseData.supabaseUrl = data.supabaseUrl;
                  if ('supabaseKey' in data) databaseData.supabaseKey = data.supabaseKey;
                  if ('qdrantUrl' in data) databaseData.qdrantUrl = data.qdrantUrl;
                  if ('qdrantCollection' in data) databaseData.qdrantCollection = data.qdrantCollection;
                  if ('enablePooling' in data) databaseData.enablePooling = data.enablePooling;
                  if ('poolSize' in data) databaseData.poolSize = data.poolSize;
                  
                  // Agents fields
                  if ('tweetScraping' in data) agentsData.tweetScraping = data.tweetScraping;
                  if ('tweetResearch' in data) agentsData.tweetResearch = data.tweetResearch;
                  if ('blogWriting' in data) agentsData.blogWriting = data.blogWriting;
                  if ('blogToTweet' in data) agentsData.blogToTweet = data.blogToTweet;
                  if ('xReply' in data) agentsData.xReply = data.xReply;
                  if ('twitterPosting' in data) agentsData.twitterPosting = data.twitterPosting;
                  if ('maxConcurrentAgents' in data) agentsData.maxConcurrentAgents = data.maxConcurrentAgents;
                  if ('enableAutoRestart' in data) agentsData.enableAutoRestart = data.enableAutoRestart;
                  
                  // Persona fields
                  if ('name' in data) personaData.name = data.name;
                  if ('description' in data) personaData.description = data.description;
                  if ('tone' in data) personaData.tone = data.tone;
                  if ('humor' in data) personaData.humor = data.humor;
                  if ('enthusiasm' in data) personaData.enthusiasm = data.enthusiasm;
                  if ('assertiveness' in data) personaData.assertiveness = data.assertiveness;
                  
                  // Update each section with its respective data
                  if (Object.keys(apiKeysData).length > 0) updateFormData("apiKeys", apiKeysData);
                  if (Object.keys(databaseData).length > 0) updateFormData("database", databaseData);
                  if (Object.keys(agentsData).length > 0) updateFormData("agents", agentsData);
                  if (Object.keys(personaData).length > 0) updateFormData("persona", personaData);
                }} 
              />
            )}
          </div>
          
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentStepIndex === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
