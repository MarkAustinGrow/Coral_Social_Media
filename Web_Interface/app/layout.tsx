"use client"

import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/theme-provider"
import { ConditionalLayout } from "@/components/conditional-layout"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
