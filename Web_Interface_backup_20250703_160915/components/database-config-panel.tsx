"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockDatabaseConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  qdrantUrl: "http://localhost:6333",
  qdrantApiKey: "",
  enablePooling: true,
  poolSize: 10,
  connectionTimeout: 30,
  enableSsl: true,
  backupEnabled: true,
  backupFrequency: "daily",
  backupRetention: 7,
  connectionStatus: {
    supabase: "connected",
    qdrant: "connected"
  }
}

export function DatabaseConfigPanel() {
  const [config, setConfig] = useState(mockDatabaseConfig)
  const [testingConnection, setTestingConnection] = useState(false)

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

  const testConnection = () => {
    setTestingConnection(true)
    // Simulate API call
    setTimeout(() => {
      setTestingConnection(false)
    }, 1500)
  }

  const getConnectionStatus = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckCircle className="mr-1 h-4 w-4" />
            <span>Connected</span>
          </div>
        )
      case "disconnected":
        return (
          <div className="flex items-center text-red-600 dark:text-red-400">
            <XCircle className="mr-1 h-4 w-4" />
            <span>Disconnected</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Supabase Configuration</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <div className="flex gap-2">
              <Input
                id="supabaseUrl"
                name="supabaseUrl"
                value={config.supabaseUrl}
                onChange={handleInputChange}
              />
              <div className="w-32 flex items-center">
                {getConnectionStatus(config.connectionStatus.supabase)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supabaseKey">Supabase Key</Label>
            <Input
              id="supabaseKey"
              name="supabaseKey"
              type="password"
              value={config.supabaseKey}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Qdrant Configuration</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qdrantUrl">Qdrant URL</Label>
            <div className="flex gap-2">
              <Input
                id="qdrantUrl"
                name="qdrantUrl"
                value={config.qdrantUrl}
                onChange={handleInputChange}
              />
              <div className="w-32 flex items-center">
                {getConnectionStatus(config.connectionStatus.qdrant)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qdrantApiKey">Qdrant API Key (optional)</Label>
            <Input
              id="qdrantApiKey"
              name="qdrantApiKey"
              type="password"
              value={config.qdrantApiKey}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Connection Settings</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="poolSize">Connection Pool Size</Label>
            <Input
              id="poolSize"
              name="poolSize"
              type="number"
              min="1"
              max="100"
              value={config.poolSize}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="connectionTimeout">Connection Timeout (seconds)</Label>
            <Input
              id="connectionTimeout"
              name="connectionTimeout"
              type="number"
              min="1"
              max="300"
              value={config.connectionTimeout}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="enablePooling"
              checked={config.enablePooling}
              onCheckedChange={(checked) => handleSwitchChange("enablePooling", checked)}
            />
            <Label htmlFor="enablePooling">Enable Connection Pooling</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="enableSsl"
              checked={config.enableSsl}
              onCheckedChange={(checked) => handleSwitchChange("enableSsl", checked)}
            />
            <Label htmlFor="enableSsl">Enable SSL</Label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Backup Settings</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="backupEnabled"
              checked={config.backupEnabled}
              onCheckedChange={(checked) => handleSwitchChange("backupEnabled", checked)}
            />
            <Label htmlFor="backupEnabled">Enable Automated Backups</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="backupFrequency">Backup Frequency</Label>
            <Select
              value={config.backupFrequency}
              onValueChange={(value) => handleSelectChange("backupFrequency", value)}
              disabled={!config.backupEnabled}
            >
              <SelectTrigger id="backupFrequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="backupRetention">Backup Retention (days)</Label>
            <Input
              id="backupRetention"
              name="backupRetention"
              type="number"
              min="1"
              max="365"
              value={config.backupRetention}
              onChange={handleInputChange}
              disabled={!config.backupEnabled}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={testConnection} disabled={testingConnection}>
          {testingConnection ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}
