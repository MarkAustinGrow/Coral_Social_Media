"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SupabaseDebug } from "@/components/supabase-debug"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, Activity, BarChart4, User } from "lucide-react"
import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function DebugPage() {
  const [user, setUser] = useState<any>(null)
  
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClientComponentClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
    }
    
    fetchUser()
  }, [])
  
  return (
    <DashboardShell>
      <DashboardHeader 
        heading="Debug Tools" 
        text={user ? `Tools for debugging your account and application.` : "Tools for debugging the application."}
      />
      
      {user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-3">
          <User className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">User-Specific Debug Mode</h3>
            <p className="text-sm text-blue-700">
              You are viewing debug tools as <strong>{user.email}</strong>. 
              All data shown is specific to your account.
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Your Database Connection
            </CardTitle>
            <CardDescription>
              Test Supabase connection and view your Twitter accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check if your Supabase connection is working properly and view your Twitter accounts.
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
              Your Agent Status
            </CardTitle>
            <CardDescription>
              Initialize and test your agent status functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update your agent names, set random statuses, and test your agent status functionality.
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
              Your Activity Logs
            </CardTitle>
            <CardDescription>
              View and manage your system logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate sample logs, clear your logs, and test the log viewer functionality for your account.
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
