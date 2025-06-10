import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AccountList } from "@/components/account-list"
import { Plus } from "lucide-react"

export const metadata: Metadata = {
  title: "X Accounts Management | Social Media Agent System",
  description: "Configure and prioritize Twitter accounts",
}

export default function AccountsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="X Accounts Management" text="Configure and prioritize Twitter accounts.">
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </DashboardHeader>
      <div className="space-y-4">
        <AccountList />
      </div>
    </DashboardShell>
  )
}
