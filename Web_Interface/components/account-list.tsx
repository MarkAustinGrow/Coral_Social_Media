"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExternalLink, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react"

// Mock data - would be fetched from API in real implementation
const mockAccounts = [
  {
    id: 1,
    username: "techcompany",
    displayName: "Tech Company",
    priority: 10,
    lastFetched: "2025-06-10T19:30:00Z",
    active: true,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    username: "productlaunch",
    displayName: "Product Launch",
    priority: 8,
    lastFetched: "2025-06-10T18:45:00Z",
    active: true,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    username: "techsupport",
    displayName: "Tech Support",
    priority: 6,
    lastFetched: "2025-06-10T17:15:00Z",
    active: true,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 4,
    username: "marketingteam",
    displayName: "Marketing Team",
    priority: 7,
    lastFetched: "2025-06-10T16:30:00Z",
    active: true,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 5,
    username: "devrelations",
    displayName: "Developer Relations",
    priority: 5,
    lastFetched: "2025-06-10T15:00:00Z",
    active: false,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 6,
    username: "engineeringblog",
    displayName: "Engineering Blog",
    priority: 4,
    lastFetched: "2025-06-10T14:15:00Z",
    active: true,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 7,
    username: "designteam",
    displayName: "Design Team",
    priority: 3,
    lastFetched: "2025-06-10T13:30:00Z",
    active: false,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 8,
    username: "companyevents",
    displayName: "Company Events",
    priority: 2,
    lastFetched: "2025-06-10T12:45:00Z",
    active: true,
    avatarUrl: "/placeholder.svg?height=40&width=40",
  },
]

export function AccountList() {
  const [accounts, setAccounts] = useState([...mockAccounts].sort((a, b) => b.priority - a.priority))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handlePriorityChange = (id: number, value: number[]) => {
    setAccounts(
      accounts
        .map((account) => (account.id === id ? { ...account, priority: value[0] } : account))
        .sort((a, b) => b.priority - a.priority),
    )
  }

  const handleActiveChange = (id: number, checked: boolean) => {
    setAccounts(accounts.map((account) => (account.id === id ? { ...account, active: checked } : account)))
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <div key={account.id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={account.avatarUrl || "/placeholder.svg"} alt={account.displayName} />
              <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{account.displayName}</div>
              <div className="text-sm text-muted-foreground">@{account.username}</div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">Priority</div>
              <div className="flex items-center gap-2">
                <Slider
                  defaultValue={[account.priority]}
                  max={10}
                  step={1}
                  className="w-24"
                  onValueChange={(value) => handlePriorityChange(account.id, value)}
                />
                <span className="text-sm font-medium w-4">{account.priority}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">Last Fetched</div>
              <div className="text-sm">{formatDate(account.lastFetched)}</div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">Active</div>
              <Switch checked={account.active} onCheckedChange={(checked) => handleActiveChange(account.id, checked)} />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on X
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test Connection
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
