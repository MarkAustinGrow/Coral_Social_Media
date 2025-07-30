import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ContentCalendar } from "@/components/content-calendar"

export const metadata: Metadata = {
  title: "Content Calendar | Macro Economics Expert Agentic System",
  description: "Visualize and manage content schedules",
}

export default function CalendarPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Content Calendar" text="Visualize and manage content schedules." />
      <Card>
        <CardHeader>
          <CardTitle>Content Schedule</CardTitle>
          <CardDescription>View and manage your content publishing schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentCalendar />
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
