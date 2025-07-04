"use client"

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { TopNav } from '@/components/top-nav'
import { SideNav } from '@/components/side-nav'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/auth/')

  // If it's an auth page, render without navigation
  if (isAuthPage) {
    return <>{children}</>
  }

  // If user is not authenticated and not on auth page, show minimal layout
  if (!loading && !user) {
    return <>{children}</>
  }

  // For authenticated users on non-auth pages, show full layout
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <SideNav />
        <main className="flex w-full flex-col overflow-hidden pt-4 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
