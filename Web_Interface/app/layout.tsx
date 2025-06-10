"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  
  useEffect(() => {
    // Check if setup is complete by looking for stored configuration
    const checkSetupStatus = () => {
      try {
        const storedConfig = localStorage.getItem("social-media-agent-config")
        const isComplete = !!storedConfig
        setIsSetupComplete(isComplete)
        
        // If setup is not complete and we're not already on the setup page, redirect to setup
        if (!isComplete && pathname !== "/setup") {
          router.push("/setup")
        }
      } catch (error) {
        // If localStorage is not available (e.g., in SSR), we'll handle it on client side
        console.error("Error checking setup status:", error)
        setIsSetupComplete(false)
      }
    }
    
    checkSetupStatus()
  }, [pathname, router])
  
  // Show loading state while checking setup status
  if (isSetupComplete === null) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-background">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </body>
      </html>
    )
  }
  
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
