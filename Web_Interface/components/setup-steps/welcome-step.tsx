"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"

interface WelcomeStepProps {
  formData: any
  updateFormData: (data: any) => void
}

export function WelcomeStep({ formData, updateFormData }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Welcome to the Social Media Agent System</AlertTitle>
        <AlertDescription>
          This wizard will guide you through setting up your system. You'll need:
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <div className="grid gap-2">
          <h3 className="font-medium">API Keys</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>OpenAI API key for content generation</li>
            <li>Twitter API credentials (API key, secret, access token, etc.)</li>
            <li>Supabase credentials for database storage</li>
          </ul>
        </div>
        
        <div className="grid gap-2">
          <h3 className="font-medium">Database Setup</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>Supabase project URL and API key</li>
            <li>Qdrant vector database (optional, for advanced features)</li>
          </ul>
        </div>
        
        <div className="grid gap-2">
          <h3 className="font-medium">Agent Configuration</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>Select which agents to enable</li>
            <li>Configure agent behavior and scheduling</li>
          </ul>
        </div>
        
        <div className="grid gap-2">
          <h3 className="font-medium">Persona Setup</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>Define your brand voice and tone</li>
            <li>Configure content style preferences</li>
          </ul>
        </div>
      </div>
      
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Your API keys and credentials will be stored securely. Never share them with anyone.
        </AlertDescription>
      </Alert>
    </div>
  )
}
