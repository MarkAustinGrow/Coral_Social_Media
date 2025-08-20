"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
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

// Account type definition
type Account = {
  id: number
  username: string
  display_name: string
  priority: number
  last_fetched_at: string | null
  active: boolean
  avatarUrl?: string
}

// Convert database account to UI account
const mapDatabaseAccountToUIAccount = (dbAccount: any): Account => {
  return {
    id: dbAccount.id,
    username: dbAccount.username,
    display_name: dbAccount.display_name || dbAccount.username,
    priority: dbAccount.priority || 5,
    last_fetched_at: dbAccount.last_fetched_at,
    active: true, // Default to active
    avatarUrl: "/placeholder.svg?height=40&width=40",
  }
}

// No mock data - we'll only show real accounts from the database

export function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()
  
  // Fetch accounts from Supabase with authentication
  const fetchAccounts = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔧 AccountList: Fetching user accounts...')
      
      // Create authenticated Supabase client
      const supabase = createClientComponentClient<Database>()
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`)
      }
      
      if (!session?.user) {
        throw new Error('Not authenticated')
      }
      
      console.log('✅ AccountList: User authenticated:', session.user.id)
      
      // Fetch accounts for the current user (RLS will automatically filter)
      const { data, error } = await supabase
        .from('x_accounts')
        .select('*')
        .order('priority', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch accounts: ${error.message}`)
      }
      
      console.log('✅ AccountList: Fetched accounts:', data?.length || 0)
      
      if (data && data.length > 0) {
        const mappedAccounts = data.map(mapDatabaseAccountToUIAccount)
        setAccounts(mappedAccounts)
      } else {
        // No accounts found in database
        setAccounts([])
      }
    } catch (err: any) {
      console.error('❌ AccountList: Error fetching accounts:', err)
      setError(err.message)
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Import followed accounts
  const importFollowedAccounts = async () => {
    setIsImporting(true)
    
    try {
      const response = await fetch("/api/accounts/import-followed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to import followed accounts")
      }
      
      toast({
        title: "Success",
        description: data.message || `Imported ${data.count} accounts`,
      })
      
      // Refresh the account list
      fetchAccounts()
    } catch (err: any) {
      console.error("Error importing followed accounts:", err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }
  
  // Load accounts on component mount
  useEffect(() => {
    fetchAccounts()
    
    // Log to console for debugging
    console.log("Fetching accounts from database...")
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handlePriorityChange = async (id: number, value: number[]) => {
    // Update local state immediately for responsive UI
    setAccounts(
      accounts
        .map((account) => (account.id === id ? { ...account, priority: value[0] } : account))
        .sort((a, b) => b.priority - a.priority),
    )
    
    // Update in database
    try {
      console.log('🔧 AccountList: Updating priority for account:', id, 'to:', value[0])
      
      const supabase = createClientComponentClient<Database>()
      
      const { error } = await supabase
        .from('x_accounts')
        .update({ priority: value[0] })
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to update priority: ${error.message}`)
      }
      
      console.log('✅ AccountList: Priority updated successfully')
    } catch (err: any) {
      console.error('❌ AccountList: Error updating priority:', err)
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      })
      // Revert on error
      fetchAccounts()
    }
  }

  const handleActiveChange = (id: number, checked: boolean) => {
    setAccounts(accounts.map((account) => (account.id === id ? { ...account, active: checked } : account)))
    
    // In a real implementation, you would update the active status in the database
    // This would require adding an 'active' column to the x_accounts table
  }

  // Function to remove an account
  const handleRemoveAccount = async (id: number) => {
    try {
      console.log('🔧 AccountList: Removing account:', id)
      
      const supabase = createClientComponentClient<Database>()
      
      const { error } = await supabase
        .from('x_accounts')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to remove account: ${error.message}`)
      }
      
      // Update local state
      setAccounts(accounts.filter(account => account.id !== id))
      
      console.log('✅ AccountList: Account removed successfully')
      
      toast({
        title: 'Success',
        description: 'Account removed successfully',
      })
    } catch (err: any) {
      console.error('❌ AccountList: Error removing account:', err)
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      })
    }
  }
  
  // Function to refresh account data
  const handleRefresh = () => {
    fetchAccounts()
  }

  // Make the import function available for the button click
  useEffect(() => {
    // Add the function to the window object for the button to access
    (window as any).importFollowedAccounts = importFollowedAccounts
    
    // Clean up when component unmounts
    return () => {
      delete (window as any).importFollowedAccounts
    }
  }, [])
  
  if (isLoading) {
    return <div className="py-6 text-center">Loading accounts...</div>
  }
  
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>Retry</Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-muted-foreground mb-2">No accounts found. Add accounts or import followed accounts.</p>
        </div>
      ) : (
        accounts.map((account) => 
        <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4 gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={account.avatarUrl || "/placeholder.svg"} alt={account.display_name} />
              <AvatarFallback>{account.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{account.display_name}</div>
              <div className="text-sm text-muted-foreground">@{account.username}</div>
            </div>
          </div>

          {/* Controls section - stacks on mobile, horizontal on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 md:gap-6">
            {/* Priority slider - full width on mobile */}
            <div className="flex flex-col sm:items-center gap-1">
              <div className="text-xs text-muted-foreground">Priority</div>
              <div className="flex items-center gap-2 w-full">
                <Slider
                  defaultValue={[account.priority]}
                  max={10}
                  step={1}
                  className="w-full sm:w-24"
                  onValueChange={(value) => handlePriorityChange(account.id, value)}
                />
                <span className="text-sm font-medium w-4">{account.priority}</span>
              </div>
            </div>

            {/* Last fetched and Active toggle - side by side on mobile, separate on desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-col sm:items-center gap-1">
              <div>
                <div className="text-xs text-muted-foreground">Last Fetched</div>
                <div className="text-sm">{formatDate(account.last_fetched_at)}</div>
              </div>
              <div className="flex flex-col items-end sm:items-center gap-1">
                <div className="text-xs text-muted-foreground">Active</div>
                <Switch checked={account.active} onCheckedChange={(checked) => handleActiveChange(account.id, checked)} />
              </div>
            </div>

            {/* Action buttons - consolidated into a single dropdown on all screen sizes */}
            <div className="flex justify-end sm:justify-start items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleRemoveAccount(account.id)}
                  >
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
