"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

interface ApiKeysStepProps {
  formData: {
    openai: string
    perplexity: string
    anthropic: string
    twitter: string
    twitterBearer: string
    twitterApiKey: string
    twitterApiSecret: string
    twitterAccessToken: string
    twitterAccessSecret: string
  }
  updateFormData: (data: any) => void
}

export function ApiKeysStep({ formData, updateFormData }: ApiKeysStepProps) {
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean | null>>({})
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({})
  
  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updateFormData({ [name]: value })
    
    // Reset validation status when input changes
    if (validationStatus[name] !== null) {
      setValidationStatus(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }
  
  const validateKey = (key: string) => {
    setIsValidating(prev => ({ ...prev, [key]: true }))
    
    // Simulate API validation
    setTimeout(() => {
      // In a real implementation, this would make an API call to validate the key
      const isValid = formData[key as keyof typeof formData]?.length > 10
      
      setValidationStatus(prev => ({
        ...prev,
        [key]: isValid
      }))
      
      setIsValidating(prev => ({ ...prev, [key]: false }))
    }, 1500)
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="openai" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="ai-services">AI Services</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
        </TabsList>
        
        <TabsContent value="openai" className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="openai">OpenAI API Key</Label>
              {validationStatus.openai === true && <CheckCircle className="h-4 w-4 text-green-500" />}
              {validationStatus.openai === false && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openai"
                  name="openai"
                  type={visibleKeys.openai ? "text" : "password"}
                  placeholder="sk-..."
                  value={formData.openai}
                  onChange={handleInputChange}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleKeyVisibility("openai")}
              >
                {visibleKeys.openai ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => validateKey("openai")}
                disabled={isValidating.openai || !formData.openai}
              >
                {isValidating.openai ? "Validating..." : "Validate"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your OpenAI API key is used for content generation and analysis.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="ai-services" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="perplexity">Perplexity API Key</Label>
                {validationStatus.perplexity === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                {validationStatus.perplexity === false && <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="perplexity"
                    name="perplexity"
                    type={visibleKeys.perplexity ? "text" : "password"}
                    placeholder="pplx-..."
                    value={formData.perplexity}
                    onChange={handleInputChange}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility("perplexity")}
                >
                  {visibleKeys.perplexity ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => validateKey("perplexity")}
                  disabled={isValidating.perplexity || !formData.perplexity}
                >
                  {isValidating.perplexity ? "Validating..." : "Validate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Perplexity API key is used for fact-checking and research in the blog critique agent.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="anthropic">Anthropic API Key</Label>
                {validationStatus.anthropic === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                {validationStatus.anthropic === false && <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="anthropic"
                    name="anthropic"
                    type={visibleKeys.anthropic ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={formData.anthropic}
                    onChange={handleInputChange}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility("anthropic")}
                >
                  {visibleKeys.anthropic ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => validateKey("anthropic")}
                  disabled={isValidating.anthropic || !formData.anthropic}
                >
                  {isValidating.anthropic ? "Validating..." : "Validate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anthropic API key is used for advanced reasoning and analysis tasks.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="twitter" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="twitterBearer">Twitter Bearer Token</Label>
                {validationStatus.twitterBearer === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                {validationStatus.twitterBearer === false && <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="twitterBearer"
                    name="twitterBearer"
                    type={visibleKeys.twitterBearer ? "text" : "password"}
                    placeholder="AAAA..."
                    value={formData.twitterBearer}
                    onChange={handleInputChange}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleKeyVisibility("twitterBearer")}
                >
                  {visibleKeys.twitterBearer ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => validateKey("twitterBearer")}
                  disabled={isValidating.twitterBearer || !formData.twitterBearer}
                >
                  {isValidating.twitterBearer ? "Validating..." : "Validate"}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitterApiKey">API Key</Label>
                <Input
                  id="twitterApiKey"
                  name="twitterApiKey"
                  type={visibleKeys.twitterApiKey ? "text" : "password"}
                  value={formData.twitterApiKey}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterApiSecret">API Secret</Label>
                <Input
                  id="twitterApiSecret"
                  name="twitterApiSecret"
                  type={visibleKeys.twitterApiSecret ? "text" : "password"}
                  value={formData.twitterApiSecret}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterAccessToken">Access Token</Label>
                <Input
                  id="twitterAccessToken"
                  name="twitterAccessToken"
                  type={visibleKeys.twitterAccessToken ? "text" : "password"}
                  value={formData.twitterAccessToken}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterAccessSecret">Access Secret</Label>
                <Input
                  id="twitterAccessSecret"
                  name="twitterAccessSecret"
                  type={visibleKeys.twitterAccessSecret ? "text" : "password"}
                  value={formData.twitterAccessSecret}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Twitter API credentials are used for tweet scraping, posting, and engagement.
            </p>
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  )
}
