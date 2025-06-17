"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SupabaseDebug } from "@/components/supabase-debug"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, Activity, BarChart4 } from "lucide-react"

export default function DebugPage() {
  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Debug Tools" 
        text="Tools for debugging the application."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Database Debug
            </CardTitle>
            <CardDescription>
              Test Supabase connection and view database data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check if the Supabase connection is working properly and view account data.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="#supabase-debug">Go to Database Debug</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Agent Status Debug
            </CardTitle>
            <CardDescription>
              Initialize and test agent status functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update agent names, set random statuses, and test agent status functionality.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/debug/agents">Go to Agent Status Debug</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart4 className="mr-2 h-5 w-5" />
              Logs Debug
            </CardTitle>
            <CardDescription>
              Add sample logs and test log functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate sample logs, clear logs, and test the log viewer functionality.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/debug/logs">Go to Logs Debug</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-6 space-y-6" id="supabase-debug">
        <SupabaseDebug />
      </div>
    </DashboardShell>
  )
}
