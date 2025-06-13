"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SupabaseDebug } from "@/components/supabase-debug"

export default function DebugPage() {
  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Debug Tools" 
        text="Tools for debugging the application."
      />
      <div className="space-y-6">
        <SupabaseDebug />
      </div>
    </DashboardShell>
  )
}
