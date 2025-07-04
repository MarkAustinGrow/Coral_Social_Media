"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AccountList } from "@/components/account-list"
import { AddAccountDialog } from "@/components/add-account-dialog"
import { Users } from "lucide-react"

export default function AccountsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Function to handle account refresh
  const handleRefreshAccounts = () => {
    setRefreshTrigger(prev => prev + 1)
  }
  
  // Function to handle the "Add Followed" button click
  const handleAddFollowed = () => {
    // Call the importFollowedAccounts function exposed by the AccountList component
    if (typeof window !== "undefined" && (window as any).importFollowedAccounts) {
      (window as any).importFollowedAccounts();
      // Refresh the account list after importing
      setTimeout(() => handleRefreshAccounts(), 1000);
    }
  };

  return (
    <DashboardShell>
      <DashboardHeader heading="X Accounts Management" text="Configure and prioritize Twitter accounts.">
        <div className="flex items-center gap-2">
          <AddAccountDialog onAccountAdded={handleRefreshAccounts} />
          <Button variant="outline" onClick={handleAddFollowed}>
            <Users className="mr-2 h-4 w-4" />
            Add Followed
          </Button>
        </div>
      </DashboardHeader>
      <div className="space-y-4">
        <AccountList key={refreshTrigger} />
      </div>
    </DashboardShell>
  )
}
