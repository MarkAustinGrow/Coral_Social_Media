import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PersonaEditor } from "@/components/persona-editor"
import { PersonaPreview } from "@/components/persona-preview"
import { PersonaTemplates } from "@/components/persona-templates"
import { Save, Download, Upload, RotateCcw } from "lucide-react"

export const metadata: Metadata = {
  title: "Persona Configuration | Social Media Agent System",
  description: "Configure the system's persona and tone",
}

export default function PersonaPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Persona Configuration" text="Configure the system's persona and tone.">
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
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
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DashboardHeader>
      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Version History</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona Editor</CardTitle>
              <CardDescription>Edit the system's persona configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonaEditor />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save Persona</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona Preview</CardTitle>
              <CardDescription>Preview how the persona will respond in different scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonaPreview />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona Templates</CardTitle>
              <CardDescription>Choose from pre-defined persona templates</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonaTemplates />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>View and restore previous persona configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-muted-foreground py-8">
                Version history will be implemented in a future update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
