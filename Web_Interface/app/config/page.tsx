import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeysPanel } from "@/components/api-keys-panel"

export const metadata: Metadata = {
  title: "X/Twitter Configuration | Coral Social Media Infrastructure",
  description: "Configure your personal X/Twitter API credentials",
}

export default function ConfigPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="X/Twitter Configuration" text="Configure your personal X/Twitter API credentials.">
        <div className="flex justify-end">
          <Button className="w-full sm:w-auto">
            Save Changes
          </Button>
        </div>
      </DashboardHeader>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>X/Twitter API Credentials</CardTitle>
            <CardDescription>Configure your personal X Developer account credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ApiKeysPanel />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button className="w-full sm:w-auto">Save X/Twitter Credentials</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  )
}
