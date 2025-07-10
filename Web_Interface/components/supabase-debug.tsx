"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, User } from "lucide-react"

export function SupabaseDebug() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/debug/supabase")
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to test Supabase connection")
      }
      
      setResult(data)
    } catch (err: any) {
      console.error("Error testing Supabase connection:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Supabase Connection Debug</CardTitle>
        <CardDescription>
          Test the connection to your Supabase database and view your Twitter accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result && (
          <div className="space-y-4">
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Connection Successful</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
            
            {/* User Information */}
            {result.user && (
              <div className="p-3 bg-blue-50 rounded-md flex items-center space-x-2 border border-blue-200">
                <User className="h-4 w-4 text-blue-500" />
                <div className="text-sm">
                  <span className="font-medium">Current User:</span> {result.user.email}
                  <span className="text-xs text-muted-foreground ml-2">({result.user.id})</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Your Twitter Accounts: {result.accountCount || 0}</h3>
              
              {result.accounts && result.accounts.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Username</th>
                        <th className="p-2 text-left">Display Name</th>
                        <th className="p-2 text-left">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.accounts.map((account: any) => (
                        <tr key={account.id} className="border-t">
                          <td className="p-2">{account.id}</td>
                          <td className="p-2">{account.username}</td>
                          <td className="p-2">{account.display_name}</td>
                          <td className="p-2">{account.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You don't have any Twitter accounts configured yet. 
                  Visit the <a href="/accounts" className="text-blue-600 hover:underline">Accounts page</a> to add some.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={testConnection} disabled={isLoading}>
          {isLoading ? "Testing..." : "Test Supabase Connection"}
        </Button>
      </CardFooter>
    </Card>
  )
}
