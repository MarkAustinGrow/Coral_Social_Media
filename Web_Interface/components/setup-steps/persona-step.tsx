"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, MessageSquare } from "lucide-react"

interface PersonaStepProps {
  formData: {
    name: string
    description: string
    tone: number
    humor: number
    enthusiasm: number
    assertiveness: number
  }
  updateFormData: (data: any) => void
}

export function PersonaStep({ formData, updateFormData }: PersonaStepProps) {
  const [activeTab, setActiveTab] = useState("persona")
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    updateFormData({ [name]: value })
  }
  
  const handleSliderChange = (name: string, value: number[]) => {
    updateFormData({ [name]: value[0] })
  }
  
  // Sample tweets based on current persona settings
  const getSampleTweet = () => {
    const { tone, humor, enthusiasm, assertiveness } = formData
    
    if (tone > 70 && humor < 30 && assertiveness > 70) {
      return "Just published our analysis of the latest tech industry trends. The data clearly shows a 37% increase in AI adoption across enterprise businesses. #TechTrends #DataAnalysis"
    } else if (humor > 60 && enthusiasm > 60) {
      return "OMG! 🤯 Just discovered the coolest new AI tool that basically writes your emails for you! Who else is ready to let the robots take over this part of our jobs?? #AItools #TechHumor #FutureIsNow"
    } else if (tone < 50 && enthusiasm > 60) {
      return "Hey friends! 👋 I've been thinking about the future of remote work and put together some thoughts on how it might evolve in the next 5 years. Would love to hear what you think! #RemoteWork #FutureOfWork"
    } else {
      return "Interesting findings in our latest research: companies implementing AI solutions are seeing a 23% efficiency boost on average. Here's what this means for the industry... #AI #BusinessTech #Innovation"
    }
  }
  
  // Sample blog intro based on current persona settings
  const getSampleBlogIntro = () => {
    const { tone, humor, enthusiasm, assertiveness } = formData
    
    if (tone > 70 && humor < 30 && assertiveness > 70) {
      return "The rapid advancement of artificial intelligence technologies presents significant implications for enterprise operations. This analysis examines key metrics and implementation strategies that organizations must consider to maintain competitive advantage in an increasingly AI-driven marketplace."
    } else if (humor > 60 && enthusiasm > 60) {
      return "Remember when we all thought robots would look like the Terminator? Well, plot twist! They're actually hiding in your email inbox, calendar app, and pretty much everywhere else in your digital life. And you know what? That's awesome! Let's dive into the hilarious reality of how AI is sneaking into our workday and making things way better."
    } else if (tone < 50 && enthusiasm > 60) {
      return "Have you ever wondered what your workday might look like five years from now? I've been thinking about this a lot lately, especially as remote work continues to evolve. In this post, I'm excited to share some thoughts about where we might be headed and how we can prepare for an increasingly digital workplace."
    } else {
      return "Artificial intelligence implementation has reached a critical inflection point across industries. Our research indicates a clear correlation between strategic AI adoption and measurable business outcomes. This article explores the key findings and provides actionable insights for technology leaders."
    }
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="persona" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="persona">
            <User className="mr-2 h-4 w-4" />
            Persona Details
          </TabsTrigger>
          <TabsTrigger value="preview">
            <MessageSquare className="mr-2 h-4 w-4" />
            Content Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="persona" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Persona Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Tech Thought Leader"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Persona Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends."
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
            
            <div className="grid gap-6 pt-2 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="tone">Formality</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.tone < 30 ? "Casual" : formData.tone < 60 ? "Balanced" : "Formal"}
                  </span>
                </div>
                <Slider
                  id="tone"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.tone]}
                  onValueChange={(value) => handleSliderChange("tone", value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="humor">Humor</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.humor < 30 ? "Serious" : formData.humor < 60 ? "Moderate" : "Playful"}
                  </span>
                </div>
                <Slider
                  id="humor"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.humor]}
                  onValueChange={(value) => handleSliderChange("humor", value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="enthusiasm">Enthusiasm</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.enthusiasm < 30 ? "Reserved" : formData.enthusiasm < 60 ? "Moderate" : "Excited"}
                  </span>
                </div>
                <Slider
                  id="enthusiasm"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.enthusiasm]}
                  onValueChange={(value) => handleSliderChange("enthusiasm", value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="assertiveness">Assertiveness</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.assertiveness < 30 ? "Tentative" : formData.assertiveness < 60 ? "Balanced" : "Confident"}
                  </span>
                </div>
                <Slider
                  id="assertiveness"
                  min={0}
                  max={100}
                  step={1}
                  value={[formData.assertiveness]}
                  onValueChange={(value) => handleSliderChange("assertiveness", value)}
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Sample Tweet</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{formData.name}</div>
                      <div className="text-sm text-muted-foreground mb-2">@{formData.name.toLowerCase().replace(/\s+/g, '_')}</div>
                      <p className="text-sm">{getSampleTweet()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Sample Blog Introduction</h3>
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">The Future of Technology: What's Next?</h4>
                  <p className="text-sm">{getSampleBlogIntro()}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
