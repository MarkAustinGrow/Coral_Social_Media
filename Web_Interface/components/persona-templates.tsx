"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertCircle, Check, Info } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockTemplates = [
  {
    id: 1,
    name: "Tech Thought Leader",
    description: "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
    tags: ["Technology", "Professional", "Educational"],
    voice: {
      tone: 70, // 0-100: formal to casual
      humor: 40, // 0-100: serious to humorous
      enthusiasm: 65, // 0-100: reserved to enthusiastic
      assertiveness: 75, // 0-100: gentle to assertive
    },
    expertise: [
      "Artificial Intelligence",
      "Machine Learning",
      "Software Development",
      "Tech Industry Trends",
      "Digital Transformation"
    ],
  },
  {
    id: 2,
    name: "Friendly Tech Educator",
    description: "An approachable and enthusiastic technology educator who explains complex concepts in simple terms for beginners.",
    tags: ["Educational", "Friendly", "Beginner-Friendly"],
    voice: {
      tone: 85, // 0-100: formal to casual
      humor: 70, // 0-100: serious to humorous
      enthusiasm: 90, // 0-100: reserved to enthusiastic
      assertiveness: 50, // 0-100: gentle to assertive
    },
    expertise: [
      "Programming Basics",
      "Web Development",
      "Technology Fundamentals",
      "Digital Literacy",
      "Learning Resources"
    ],
  },
  {
    id: 3,
    name: "Data-Driven Analyst",
    description: "A precise and analytical expert who provides data-backed insights and objective analysis on technology and business topics.",
    tags: ["Data-Driven", "Analytical", "Business"],
    voice: {
      tone: 30, // 0-100: formal to casual
      humor: 20, // 0-100: serious to humorous
      enthusiasm: 40, // 0-100: reserved to enthusiastic
      assertiveness: 80, // 0-100: gentle to assertive
    },
    expertise: [
      "Data Analysis",
      "Business Intelligence",
      "Market Trends",
      "Statistical Methods",
      "Research Methodology"
    ],
  },
  {
    id: 4,
    name: "Tech Visionary",
    description: "A forward-thinking technology visionary who explores cutting-edge innovations and their potential impact on society and business.",
    tags: ["Visionary", "Futurist", "Innovative"],
    voice: {
      tone: 60, // 0-100: formal to casual
      humor: 50, // 0-100: serious to humorous
      enthusiasm: 85, // 0-100: reserved to enthusiastic
      assertiveness: 70, // 0-100: gentle to assertive
    },
    expertise: [
      "Emerging Technologies",
      "Future Trends",
      "Innovation Strategy",
      "Digital Transformation",
      "Technology Ethics"
    ],
  },
  {
    id: 5,
    name: "Tech Startup Advisor",
    description: "A practical and experienced startup advisor who provides actionable insights for technology entrepreneurs and early-stage companies.",
    tags: ["Startup", "Entrepreneurship", "Practical"],
    voice: {
      tone: 75, // 0-100: formal to casual
      humor: 60, // 0-100: serious to humorous
      enthusiasm: 70, // 0-100: reserved to enthusiastic
      assertiveness: 85, // 0-100: gentle to assertive
    },
    expertise: [
      "Startup Strategy",
      "Product Development",
      "Growth Hacking",
      "Venture Capital",
      "Technology Market Fit"
    ],
  },
  {
    id: 6,
    name: "Tech Ethicist",
    description: "A thoughtful and balanced voice on ethical considerations in technology development, deployment, and regulation.",
    tags: ["Ethics", "Balanced", "Thoughtful"],
    voice: {
      tone: 50, // 0-100: formal to casual
      humor: 30, // 0-100: serious to humorous
      enthusiasm: 60, // 0-100: reserved to enthusiastic
      assertiveness: 65, // 0-100: gentle to assertive
    },
    expertise: [
      "Technology Ethics",
      "AI Safety",
      "Digital Privacy",
      "Responsible Innovation",
      "Tech Regulation"
    ],
  },
]

export function PersonaTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [applySuccess, setApplySuccess] = useState(false)
  
  const handleApplyTemplate = () => {
    // Simulate API call
    setTimeout(() => {
      setApplySuccess(true)
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setApplySuccess(false)
      }, 3000)
    }, 500)
  }
  
  const getVoiceDescription = (voice: any) => {
    const descriptions = []
    
    if (voice.tone < 30) descriptions.push("Formal")
    else if (voice.tone > 70) descriptions.push("Casual")
    else descriptions.push("Balanced Formality")
    
    if (voice.humor < 30) descriptions.push("Serious")
    else if (voice.humor > 70) descriptions.push("Humorous")
    else descriptions.push("Moderately Humorous")
    
    if (voice.enthusiasm < 30) descriptions.push("Reserved")
    else if (voice.enthusiasm > 70) descriptions.push("Enthusiastic")
    else descriptions.push("Moderately Enthusiastic")
    
    if (voice.assertiveness < 30) descriptions.push("Gentle")
    else if (voice.assertiveness > 70) descriptions.push("Assertive")
    else descriptions.push("Moderately Assertive")
    
    return descriptions.join(", ")
  }
  
  return (
    <div className="space-y-6">
      {applySuccess && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center text-green-800 dark:text-green-200 mb-4">
          <Check className="h-5 w-5 mr-2" />
          Template applied successfully! The persona editor has been updated.
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockTemplates.map((template) => (
          <Card key={template.id} className={`cursor-pointer transition-all ${selectedTemplate === template.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`} onClick={() => setSelectedTemplate(template.id)}>
            <CardHeader className="pb-2">
              <CardTitle>{template.name}</CardTitle>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{template.name}</DialogTitle>
                    <DialogDescription>{template.description}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Voice & Tone</h4>
                      <p className="text-sm text-muted-foreground">{getVoiceDescription(template.voice)}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Areas of Expertise</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.expertise.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Applying this template will replace your current persona configuration. You can still make adjustments after applying.
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedTemplate(template.id)}>
                      Select Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="text-xs text-muted-foreground">
                {template.expertise.length} expertise areas
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleApplyTemplate} 
          disabled={selectedTemplate === null}
        >
          Apply Selected Template
        </Button>
      </div>
    </div>
  )
}
