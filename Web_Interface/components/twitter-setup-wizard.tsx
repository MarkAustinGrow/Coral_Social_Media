"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Twitter, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

const steps = [
  { id: "welcome", title: "Welcome", description: "Connect your Twitter account to get started" },
  { id: "developer-guide", title: "Developer Account", description: "Set up your Twitter Developer account" },
  { id: "credentials", title: "API Credentials", description: "Enter your Twitter API keys" },
  { id: "verify", title: "Verify Connection", description: "Test your credentials and confirm account" },
  { id: "complete", title: "Complete", description: "You're all set!" },
]

interface TwitterCredentials {
  api_key: string
  api_secret: string
  access_token: string
  access_token_secret: string
}

interface AccountInfo {
  username: string
  display_name: string
  user_id: string
  followers_count: number
  following_count: number
  verified: boolean
  profile_image_url: string
}

export function TwitterSetupWizard() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [credentials, setCredentials] = useState<TwitterCredentials>({
    api_key: "",
    api_secret: "",
    access_token: "",
    access_token_secret: ""
  })
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false)
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true)

  const currentStep = steps[currentStepIndex]
  const progress = (currentStepIndex / (steps.length - 1)) * 100

  // Check for existing credentials when component loads
  useEffect(() => {
    const checkExistingCredentials = async () => {
      if (!user) return

      try {
        setIsCheckingCredentials(true)
        setError(null)
        
        const response = await fetch('/api/user/twitter-credentials')
        const result = await response.json()

        if (!response.ok || !result.success) {
          // Handle specific error cases
          if (response.status === 404 || result.error?.includes('not found')) {
            // No credentials found - this is normal for new users, continue with setup
            console.log('No existing credentials found, proceeding with setup')
            return
          } else if (response.status === 401 || result.error?.includes('not authenticated')) {
            setError('Authentication failed. Please log out and log back in.')
            return
          } else {
            // Other errors - show them to the user
            const errorMessage = result.error || 'Failed to check existing credentials'
            setError(`Error checking credentials: ${errorMessage}`)
            return
          }
        }

        if (result.credentials) {
          setHasExistingCredentials(true)
          setCredentials(result.credentials)
          // Skip to the complete step if credentials exist and are verified
          setCurrentStepIndex(4) // Complete step
          setSuccess("Twitter credentials already configured!")
        }
      } catch (error: any) {
        console.error('Error checking existing credentials:', error)
        setError(`Network error while checking credentials: ${error.message}`)
      } finally {
        setIsCheckingCredentials(false)
      }
    }

    checkExistingCredentials()
  }, [user])

  // Show loading state while checking credentials
  if (isCheckingCredentials) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-8 h-8">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <p className="text-muted-foreground">Checking existing credentials...</p>
      </div>
    )
  }

  // Show existing credentials message if found
  if (hasExistingCredentials && currentStepIndex === 4) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Twitter Already Connected!</h3>
              <p className="text-muted-foreground">
                Your Twitter account is already set up and ready to use with 8 Interns.
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Status:</strong> Your Twitter credentials are configured and working.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setHasExistingCredentials(false)
                  setCurrentStepIndex(0)
                  setCredentials({
                    api_key: "",
                    api_secret: "",
                    access_token: "",
                    access_token_secret: ""
                  })
                }}
              >
                Reconfigure Credentials
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
      setError(null)
      setSuccess(null)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
      setError(null)
      setSuccess(null)
    }
  }

  const handleVerifyCredentials = async () => {
    if (!credentials.api_key || !credentials.api_secret || !credentials.access_token || !credentials.access_token_secret) {
      setError("Please fill in all credential fields")
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/user/twitter-credentials/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      const result = await response.json()

      if (result.success) {
        setAccountInfo(result.accountInfo)
        setSuccess("Credentials verified successfully!")
        // Auto-advance to next step after successful verification
        setTimeout(() => handleNext(), 1500)
      } else {
        setError(result.error || "Failed to verify credentials")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSaveAndComplete = async () => {
    if (!user || !accountInfo) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/user/twitter-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...credentials,
          twitter_username: accountInfo.username
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess("Setup completed successfully!")
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(result.error || "Failed to save credentials")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep.id) {
      case "welcome":
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Twitter className="w-8 h-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Connect Your Twitter Account</h3>
              <p className="text-muted-foreground">
                To use the 8 Interns social media automation system, you'll need to connect your Twitter account. 
                This allows our agents to post tweets, reply to mentions, and manage your social media presence.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>What you'll need:</strong> A Twitter Developer account with API access. 
                Don't worry - we'll guide you through the setup process!
              </p>
            </div>
          </div>
        )

      case "developer-guide":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Set Up Twitter Developer Account</h3>
              <p className="text-muted-foreground">
                You'll need a Twitter Developer account to get API access. Follow these steps:
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <p className="font-medium">Apply for Developer Access</p>
                  <p className="text-sm text-muted-foreground">Visit the Twitter Developer Portal and apply for access</p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="https://developer.twitter.com/en/apply-for-access" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Twitter Developer Portal
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <p className="font-medium">Create a New App</p>
                  <p className="text-sm text-muted-foreground">Once approved, create a new app in your developer dashboard</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <p className="font-medium">Generate API Keys</p>
                  <p className="text-sm text-muted-foreground">Generate your API Key, API Secret, Access Token, and Access Token Secret</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <p className="font-medium">Set Permissions</p>
                  <p className="text-sm text-muted-foreground">Make sure your app has "Read and Write" permissions</p>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The approval process can take a few hours to a few days. Make sure to provide a clear description 
                of how you'll use the API for social media automation.
              </AlertDescription>
            </Alert>
          </div>
        )

      case "credentials":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Enter Your API Credentials</h3>
              <p className="text-muted-foreground">
                Copy your API credentials from the Twitter Developer Portal and paste them below:
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="Your Twitter API Key"
                  value={credentials.api_key}
                  onChange={(e) => setCredentials(prev => ({ ...prev, api_key: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_secret">API Secret</Label>
                <Input
                  id="api_secret"
                  type="password"
                  placeholder="Your Twitter API Secret"
                  value={credentials.api_secret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, api_secret: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token</Label>
                <Input
                  id="access_token"
                  type="password"
                  placeholder="Your Twitter Access Token"
                  value={credentials.access_token}
                  onChange={(e) => setCredentials(prev => ({ ...prev, access_token: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="access_token_secret">Access Token Secret</Label>
                <Input
                  id="access_token_secret"
                  type="password"
                  placeholder="Your Twitter Access Token Secret"
                  value={credentials.access_token_secret}
                  onChange={(e) => setCredentials(prev => ({ ...prev, access_token_secret: e.target.value }))}
                />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your credentials are stored securely and encrypted. They're only used to authenticate 
                with Twitter on your behalf.
              </AlertDescription>
            </Alert>
          </div>
        )

      case "verify":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Verify Your Connection</h3>
              <p className="text-muted-foreground">
                Let's test your credentials to make sure everything is working correctly.
              </p>
            </div>

            {!accountInfo ? (
              <div className="text-center space-y-4">
                <Button 
                  onClick={handleVerifyCredentials} 
                  disabled={isVerifying}
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verify Credentials
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Connection verified successfully!</span>
                </div>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={accountInfo.profile_image_url} 
                      alt={accountInfo.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{accountInfo.display_name}</h4>
                        {accountInfo.verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{accountInfo.username}</p>
                      <div className="flex space-x-4 text-sm text-muted-foreground mt-1">
                        <span>{accountInfo.followers_count.toLocaleString()} followers</span>
                        <span>{accountInfo.following_count.toLocaleString()} following</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )

      case "complete":
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Your Twitter account has been successfully connected. You can now use all the features 
                of the 8 Interns social media automation system.
              </p>
            </div>
            
            {accountInfo && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Connected Account:</strong> @{accountInfo.username} ({accountInfo.display_name})
                </p>
              </div>
            )}

            <Button 
              onClick={handleSaveAndComplete} 
              disabled={isSaving}
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Please log in to set up your Twitter account.</p>
      </div>
    )
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
            <p className="text-muted-foreground">{currentStep.description}</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
          
          <div className="min-h-[300px]">
            {renderStepContent()}
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
            
            {currentStep.id !== "verify" && currentStep.id !== "complete" && (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
