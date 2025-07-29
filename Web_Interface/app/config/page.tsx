import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ApiKeysPanel } from "@/components/api-keys-panel"
import { Save, Download, Upload } from "lucide-react"

export const metadata: Metadata = {
  title: "API Configuration | Coral Social Media Infrastructure",
  description: "Manage API keys and external service configurations",
}

export default function ConfigPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="API Configuration" text="Manage API keys and external service configurations.">
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
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage API keys for external services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ApiKeysPanel />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button>Save API Keys</Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardShell>
  )
}
