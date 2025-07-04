"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockPersona = {
  name: "Tech Thought Leader",
  description: "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
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
  tabooTopics: [
    "Partisan Politics",
    "Religious Debates",
    "Controversial Social Issues"
  ],
  writingStyle: "The persona writes in a clear, concise manner with occasional technical terminology. Paragraphs are kept relatively short for readability. The persona uses data and examples to support points and occasionally asks rhetorical questions to engage readers.",
  audienceLevel: "intermediate", // beginner, intermediate, advanced
  personalDetails: {
    background: "20+ years in the tech industry with experience at major tech companies and startups.",
    interests: "Emerging technologies, open source software, developer tools, and tech ethics.",
    values: "Innovation, education, ethical technology development, and community building."
  }
}

export function PersonaEditor() {
  const [persona, setPersona] = useState(mockPersona)
  const [newExpertise, setNewExpertise] = useState("")
  const [newTabooTopic, setNewTabooTopic] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name.includes('.')) {
      const [section, field] = name.split('.')
      setPersona(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: value
        }
      }))
    } else {
      setPersona(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSliderChange = (name: string, value: number[]) => {
    setPersona(prev => ({
      ...prev,
      voice: {
        ...prev.voice,
        [name]: value[0]
      }
    }))
  }

  const addExpertise = () => {
    if (newExpertise.trim() !== "") {
      setPersona(prev => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()]
      }))
      setNewExpertise("")
    }
  }

  const removeExpertise = (index: number) => {
    setPersona(prev => ({
      ...prev,
      expertise: prev.expertise.filter((_, i) => i !== index)
    }))
  }

  const addTabooTopic = () => {
    if (newTabooTopic.trim() !== "") {
      setPersona(prev => ({
        ...prev,
        tabooTopics: [...prev.tabooTopics, newTabooTopic.trim()]
      }))
      setNewTabooTopic("")
    }
  }

  const removeTabooTopic = (index: number) => {
    setPersona(prev => ({
      ...prev,
      tabooTopics: prev.tabooTopics.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="voice">Voice & Tone</TabsTrigger>
          <TabsTrigger value="expertise">Expertise</TabsTrigger>
          <TabsTrigger value="details">Personal Details</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Persona Name</Label>
            <Input
              id="name"
              name="name"
              value={persona.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={persona.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="writingStyle">Writing Style</Label>
            <Textarea
              id="writingStyle"
              name="writingStyle"
              value={persona.writingStyle}
              onChange={handleInputChange}
              rows={5}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="audienceLevel">Target Audience Level</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="beginner"
                  name="audienceLevel"
                  value="beginner"
                  checked={persona.audienceLevel === "beginner"}
                  onChange={handleInputChange}
                />
                <Label htmlFor="beginner">Beginner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="intermediate"
                  name="audienceLevel"
                  value="intermediate"
                  checked={persona.audienceLevel === "intermediate"}
                  onChange={handleInputChange}
                />
                <Label htmlFor="intermediate">Intermediate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="advanced"
                  name="audienceLevel"
                  value="advanced"
                  checked={persona.audienceLevel === "advanced"}
                  onChange={handleInputChange}
                />
                <Label htmlFor="advanced">Advanced</Label>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="voice" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Formality: {persona.voice.tone}%</Label>
                <span className="text-sm text-muted-foreground">
                  {persona.voice.tone < 30 ? "Formal" : persona.voice.tone > 70 ? "Casual" : "Balanced"}
                </span>
              </div>
              <Slider
                defaultValue={[persona.voice.tone]}
                max={100}
                step={1}
                onValueChange={(value) => handleSliderChange("tone", value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Humor: {persona.voice.humor}%</Label>
                <span className="text-sm text-muted-foreground">
                  {persona.voice.humor < 30 ? "Serious" : persona.voice.humor > 70 ? "Humorous" : "Balanced"}
                </span>
              </div>
              <Slider
                defaultValue={[persona.voice.humor]}
                max={100}
                step={1}
                onValueChange={(value) => handleSliderChange("humor", value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Enthusiasm: {persona.voice.enthusiasm}%</Label>
                <span className="text-sm text-muted-foreground">
                  {persona.voice.enthusiasm < 30 ? "Reserved" : persona.voice.enthusiasm > 70 ? "Enthusiastic" : "Balanced"}
                </span>
              </div>
              <Slider
                defaultValue={[persona.voice.enthusiasm]}
                max={100}
                step={1}
                onValueChange={(value) => handleSliderChange("enthusiasm", value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Assertiveness: {persona.voice.assertiveness}%</Label>
                <span className="text-sm text-muted-foreground">
                  {persona.voice.assertiveness < 30 ? "Gentle" : persona.voice.assertiveness > 70 ? "Assertive" : "Balanced"}
                </span>
              </div>
              <Slider
                defaultValue={[persona.voice.assertiveness]}
                max={100}
                step={1}
                onValueChange={(value) => handleSliderChange("assertiveness", value)}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="expertise" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Areas of Expertise</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {persona.expertise.map((item, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeExpertise(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add area of expertise"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addExpertise()}
                />
                <Button type="button" onClick={addExpertise} variant="outline">
                  Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Taboo Topics</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {persona.tabooTopics.map((item, index) => (
                  <Badge key={index} variant="destructive" className="flex items-center gap-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTabooTopic(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add taboo topic"
                  value={newTabooTopic}
                  onChange={(e) => setNewTabooTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTabooTopic()}
                />
                <Button type="button" onClick={addTabooTopic} variant="outline">
                  Add
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="background">Background</Label>
            <Textarea
              id="background"
              name="personalDetails.background"
              value={persona.personalDetails.background}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interests">Interests</Label>
            <Textarea
              id="interests"
              name="personalDetails.interests"
              value={persona.personalDetails.interests}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="values">Values</Label>
            <Textarea
              id="values"
              name="personalDetails.values"
              value={persona.personalDetails.values}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rawJson">Raw JSON</Label>
            <Textarea
              id="rawJson"
              value={JSON.stringify(persona, null, 2)}
              rows={20}
              readOnly
              className="font-mono text-xs"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
