'use client'

import { useEffect, useState } from 'react'
import { useAuth, useSubscription } from '@/contexts/AuthContext'
import { getDashboardSummary, getApiUsageLogs, DashboardSummary, ApiUsageLog } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth()
  const { tier, usagePercentage, isNearLimit, currentUsage, usageLimit } = useSubscription()
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [recentActivity, setRecentActivity] = useState<ApiUsageLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      const [summary, activity] = await Promise.all([
        getDashboardSummary(user.id),
        getApiUsageLogs(user.id, 10)
      ])

      setDashboardData(summary)
      setRecentActivity(activity)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile?.full_name || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {tier?.toUpperCase()} Plan
              </span>
              <button
                onClick={signOut}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Usage Alert */}
        {isNearLimit && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  API Usage Warning
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  You've used {usagePercentage.toFixed(1)}% of your monthly API limit. 
                  Consider upgrading your plan to avoid service interruption.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Blog Posts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.total_blog_posts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Tweets Cached
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.total_tweets_cache || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      X Accounts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.total_x_accounts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      API Usage
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {currentUsage} / {usageLimit}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Progress Bar */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API Usage This Month</h3>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                usagePercentage > 90 ? 'bg-red-600' : 
                usagePercentage > 80 ? 'bg-yellow-600' : 
                'bg-green-600'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {usagePercentage.toFixed(1)}% of monthly limit used
          </p>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent API Activity</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                        activity.success ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.service_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.endpoint || 'API Call'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {activity.cost_cents} credits
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
