import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SystemConfigPanel } from "@/components/system-config-panel"
import { ApiKeysPanel } from "@/components/api-keys-panel"
import { DatabaseConfigPanel } from "@/components/database-config-panel"
import { Save, Download, Upload } from "lucide-react"

export const metadata: Metadata = {
  title: "System Configuration | Social Media Agent System",
  description: "Manage system-wide settings and configurations",
}

export default function ConfigPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="System Configuration" text="Manage system-wide settings and configurations.">
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
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SystemConfigPanel />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save General Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="api-keys" className="space-y-4">
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
        </TabsContent>
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>Configure database connections and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DatabaseConfigPanel />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save Database Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="scheduling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Settings</CardTitle>
              <CardDescription>Configure agent scheduling and frequency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-muted-foreground py-8">
                Scheduling configuration will be implemented in a future update.
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button disabled>Save Scheduling Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-muted-foreground py-8">
                Notification configuration will be implemented in a future update.
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button disabled>Save Notification Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
