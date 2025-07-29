import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeysPanel } from "@/components/api-keys-panel"
import { Save, Download, Upload } from "lucide-react"

export const metadata: Metadata = {
  title: "X/Twitter Configuration | Coral Social Media Infrastructure",
  description: "Configure your personal X/Twitter API credentials",
}

export default function ConfigPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="X/Twitter Configuration" text="Configure your personal X/Twitter API credentials.">
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Config
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Config
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
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
            <Button>Save X/Twitter Credentials</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  )
}
