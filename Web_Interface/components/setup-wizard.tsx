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
      twitter: "",
      twitterBearer: "",
      twitterApiKey: "",
      twitterApiSecret: "",
      twitterAccessToken: "",
      twitterAccessSecret: "",
      supabaseUrl: "",
      supabaseKey: "",
    },
    database: {
      supabaseUrl: "",
      supabaseKey: "",
      qdrantUrl: "http://localhost:6333",
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
      
      // Simulate API call to save configuration
      try {
        await new Promise(resolve => setTimeout(resolve, 2000))
        // In a real implementation, this would save the configuration to the server
        console.log("Form submitted:", formData)
        
        // Redirect to dashboard after successful submission
        window.location.href = "/"
      } catch (error) {
        console.error("Error submitting form:", error)
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
            <CurrentStepComponent 
              formData={formData[currentStep.id === "welcome" ? "apiKeys" : currentStep.id === "finish" ? "agents" : currentStep.id as keyof typeof formData]} 
              updateFormData={(data: any) => updateFormData(currentStep.id === "welcome" ? "apiKeys" : currentStep.id === "finish" ? "agents" : currentStep.id, data)} 
            />
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
