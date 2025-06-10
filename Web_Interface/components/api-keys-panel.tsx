"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, RefreshCw } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockApiKeys = [
  {
    id: 1,
    name: "OpenAI API Key",
    key: "sk-••••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:25:43Z",
  },
  {
    id: 2,
    name: "Twitter Bearer Token",
    key: "AAAA••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:24:12Z",
  },
  {
    id: 3,
    name: "Twitter API Key",
    key: "••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
  },
  {
    id: 4,
    name: "Twitter API Secret",
    key: "••••••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
  },
  {
    id: 5,
    name: "Twitter Access Token",
    key: "••••••••••••••••••••••••••••••-•••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
  },
  {
    id: 6,
    name: "Twitter Access Secret",
    key: "••••••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:20:05Z",
  },
  {
    id: 7,
    name: "Supabase URL",
    key: "https://••••••••••••••••••••••.supabase.co",
    status: "active",
    lastUsed: "2025-06-10T09:15:22Z",
  },
  {
    id: 8,
    name: "Supabase Key",
    key: "eyJh••••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:15:22Z",
  },
  {
    id: 9,
    name: "Perplexity API Key",
    key: "pplx-••••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:10:18Z",
  },
  {
    id: 10,
    name: "Anthropic API Key",
    key: "sk-ant-••••••••••••••••••••••••••••••••••••••••",
    status: "active",
    lastUsed: "2025-06-10T09:05:30Z",
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
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Expired
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            Inactive
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {apiKeys.map((apiKey) => (
        <div key={apiKey.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`apiKey-${apiKey.id}`}>{apiKey.name}</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Last used: {formatDateTime(apiKey.lastUsed)}
              </span>
              {getStatusBadge(apiKey.status)}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={`apiKey-${apiKey.id}`}
                value={visibleKeys[apiKey.id] ? apiKey.key : apiKey.key}
                type={visibleKeys[apiKey.id] ? "text" : "password"}
                readOnly
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleKeyVisibility(apiKey.id)}
            >
              {visibleKeys[apiKey.id] ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button className="w-full">Add New API Key</Button>
    </div>
  )
}
