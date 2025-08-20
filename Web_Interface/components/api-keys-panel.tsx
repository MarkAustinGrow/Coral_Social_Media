"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// User-specific Twitter/X API keys - would be fetched from user's profile in real implementation
const mockApiKeys = [
  {
    id: 1,
    name: "X/Twitter Bearer Token",
    key: "AAAA••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:24:12Z",
    description: "Required for reading tweets and user data",
  },
  {
    id: 2,
    name: "X/Twitter API Key",
    key: "••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
    description: "Your X Developer App API Key",
  },
  {
    id: 3,
    name: "X/Twitter API Secret",
    key: "••••••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
    description: "Your X Developer App API Secret",
  },
  {
    id: 4,
    name: "X/Twitter Access Token",
    key: "••••••••••••••••••••••••••••••-•••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
    description: "Access token for your X account",
  },
  {
    id: 5,
    name: "X/Twitter Access Secret",
    key: "••••••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
    description: "Access token secret for your X account",
  },
]

export function ApiKeysPanel() {
  const [apiKeys, setApiKeys] = useState(mockApiKeys)
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className={cn("bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200")}>
            Active
          </Badge>
        )
      case "expired":
        return (
          <Badge className={cn("bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200")}>
            Expired
          </Badge>
        )
      case "inactive":
        return (
          <Badge className={cn("bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200")}>
            Inactive
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">X/Twitter Developer Account Required</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          You need your own X Developer subscription to use this platform. Configure your personal X API credentials below.
          <br />
          <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
            Get X Developer Access →
          </a>
        </p>
      </div>

      {apiKeys.map((apiKey) => (
        <div key={apiKey.id} className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <Label htmlFor={`apiKey-${apiKey.id}`}>{apiKey.name}</Label>
              <p className="text-xs text-muted-foreground mt-1">{apiKey.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Last used: {formatDateTime(apiKey.lastUsed)}
              </span>
              {getStatusBadge(apiKey.status)}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full">
              <Input
                id={`apiKey-${apiKey.id}`}
                value={visibleKeys[apiKey.id] ? apiKey.key : apiKey.key}
                type={visibleKeys[apiKey.id] ? "text" : "password"}
                placeholder="Enter your X/Twitter API credential"
                className="w-full"
              />
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button
                className={cn("border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10")}
                onClick={() => toggleKeyVisibility(apiKey.id)}
              >
                {visibleKeys[apiKey.id] ? "Hide" : "Show"}
              </Button>
              <Button 
                className={cn("border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10")}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
