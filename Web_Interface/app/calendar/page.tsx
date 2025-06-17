import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ContentCalendar } from "@/components/content-calendar"
import { CalendarSettings } from "@/components/calendar-settings"
import { Calendar, Download, Upload, RefreshCw } from "lucide-react"

export const metadata: Metadata = {
  title: "Content Calendar | Social Media Agent System",
  description: "Visualize and manage content schedules",
}

export default function CalendarPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Content Calendar" text="Visualize and manage content schedules.">
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Content
          </Button>
        </div>
      </DashboardHeader>
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-5">
          <CardHeader>
            <CardTitle>Content Schedule</CardTitle>
            <CardDescription>View and manage your content publishing schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentCalendar />
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Calendar Settings</CardTitle>
            <CardDescription>Configure calendar view and scheduling preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarSettings />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button className="w-full">Apply Settings</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  )
}
