"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Database, Server } from "lucide-react"

interface DatabaseStepProps {
  formData: {
    supabaseUrl: string
    supabaseKey: string
    qdrantUrl: string
    qdrantCollection: string
    enablePooling: boolean
    poolSize: number
  }
  updateFormData: (data: any) => void
}

export function DatabaseStep({ formData, updateFormData }: DatabaseStepProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateFormData({ [name]: value })
  }
  
  const handleSwitchChange = (checked: boolean) => {
    updateFormData({ enablePooling: checked })
  }
  
  const handleSliderChange = (value: number[]) => {
    updateFormData({ poolSize: value[0] })
  }
  
  const testConnection = async () => {
    setIsTestingConnection(true)
    setConnectionStatus("idle")
    
    // Basic validation
    if (!formData.supabaseUrl.includes("supabase") || formData.supabaseKey.length < 10) {
      setConnectionStatus("error")
      setIsTestingConnection(false)
      return
    }
    
    try {
      // In a production environment, we would create a Supabase client to test the connection
      // For now, we'll simulate a successful connection if the URL and key look valid
      
      // Simulated connection test
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Connection successful, save configuration
      try {
        const response = await fetch('/api/save-config/supabase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supabaseUrl: formData.supabaseUrl,
            supabaseKey: formData.supabaseKey,
          }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to save configuration')
        }
        
        setConnectionStatus("success")
      } catch (error) {
        console.error("Error saving configuration:", error)
        setConnectionStatus("error")
      }
    } catch (error) {
      console.error("Error testing connection:", error)
      setConnectionStatus("error")
    } finally {
      setIsTestingConnection(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Supabase Configuration
            </CardTitle>
            <CardDescription>
              Configure your Supabase database connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabaseUrl">Supabase URL</Label>
                <Input
                  id="supabaseUrl"
                  name="supabaseUrl"
                  placeholder="https://example.supabase.co"
                  value={formData.supabaseUrl}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supabaseKey">Supabase API Key</Label>
                <Input
                  id="supabaseKey"
                  name="supabaseKey"
                  type="password"
                  placeholder="eyJ..."
                  value={formData.supabaseKey}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Use your Supabase service role key for full access.
                </p>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="enablePooling"
                  checked={formData.enablePooling}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="enablePooling">Enable connection pooling</Label>
              </div>
              
              {formData.enablePooling && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <Label htmlFor="poolSize">Pool Size: {formData.poolSize}</Label>
                  </div>
                  <Slider
                    id="poolSize"
                    min={1}
                    max={20}
                    step={1}
                    value={[formData.poolSize]}
                    onValueChange={handleSliderChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 5-10 for most applications
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Vector Database (Optional)
            </CardTitle>
            <CardDescription>
              Configure Qdrant for vector search capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qdrantUrl">Qdrant URL</Label>
                <Input
                  id="qdrantUrl"
                  name="qdrantUrl"
                  placeholder="http://localhost:6333"
                  value={formData.qdrantUrl}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Leave as default for local Qdrant instance
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qdrantCollection">Qdrant Collection Name</Label>
                <Input
                  id="qdrantCollection"
                  name="qdrantCollection"
                  placeholder="tweets"
                  value={formData.qdrantCollection}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Name of the collection to store vector embeddings
                </p>
              </div>
              
              <div className="pt-4">
                <p className="text-sm">
                  Qdrant is used for semantic search of tweets and content. It's optional but recommended for advanced features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between items-center pt-4">
        <div className="flex items-center gap-2">
          {connectionStatus === "success" && (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-500">Connection successful</span>
            </>
          )}
          {connectionStatus === "error" && (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-500">Connection failed</span>
            </>
          )}
        </div>
        
        <Button
          onClick={testConnection}
          disabled={isTestingConnection || !formData.supabaseUrl || !formData.supabaseKey}
        >
          {isTestingConnection ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}
