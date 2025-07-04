"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

// Mock data - would be fetched from API in real implementation
const mockConfig = {
  systemName: "Social Media Agent System",
  environment: "development",
  logLevel: "info",
  maxConcurrentAgents: 4,
  enableAutoRestart: true,
  enableErrorNotifications: true,
  maxLogRetentionDays: 30,
  defaultLanguage: "en",
  timeZone: "UTC",
}

export function SystemConfigPanel() {
  const [config, setConfig] = useState(mockConfig)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConfig((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setConfig((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setConfig((prev) => ({ ...prev, [name]: value }))
  }

  const handleSliderChange = (name: string, value: number[]) => {
    setConfig((prev) => ({ ...prev, [name]: value[0] }))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="systemName">System Name</Label>
          <Input
            id="systemName"
            name="systemName"
            value={config.systemName}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="environment">Environment</Label>
          <Select
            value={config.environment}
            onValueChange={(value) => handleSelectChange("environment", value)}
          >
            <SelectTrigger id="environment">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="logLevel">Log Level</Label>
          <Select
            value={config.logLevel}
            onValueChange={(value) => handleSelectChange("logLevel", value)}
          >
            <SelectTrigger id="logLevel">
              <SelectValue placeholder="Select log level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultLanguage">Default Language</Label>
          <Select
            value={config.defaultLanguage}
            onValueChange={(value) => handleSelectChange("defaultLanguage", value)}
          >
            <SelectTrigger id="defaultLanguage">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Maximum Concurrent Agents: {config.maxConcurrentAgents}</Label>
        <Slider
          defaultValue={[config.maxConcurrentAgents]}
          max={10}
          min={1}
          step={1}
          onValueChange={(value) => handleSliderChange("maxConcurrentAgents", value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Log Retention (Days): {config.maxLogRetentionDays}</Label>
        <Slider
          defaultValue={[config.maxLogRetentionDays]}
          max={90}
          min={1}
          step={1}
          onValueChange={(value) => handleSliderChange("maxLogRetentionDays", value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="enableAutoRestart"
            checked={config.enableAutoRestart}
            onCheckedChange={(checked) => handleSwitchChange("enableAutoRestart", checked)}
          />
          <Label htmlFor="enableAutoRestart">Enable Auto-Restart</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enableErrorNotifications"
            checked={config.enableErrorNotifications}
            onCheckedChange={(checked) => handleSwitchChange("enableErrorNotifications", checked)}
          />
          <Label htmlFor="enableErrorNotifications">Enable Error Notifications</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeZone">Time Zone</Label>
        <Select
          value={config.timeZone}
          onValueChange={(value) => handleSelectChange("timeZone", value)}
        >
          <SelectTrigger id="timeZone">
            <SelectValue placeholder="Select time zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
            <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
            <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
            <SelectItem value="Europe/London">London (GMT)</SelectItem>
            <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
            <SelectItem value="Asia/Tokyo">Japan Standard Time (JST)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
