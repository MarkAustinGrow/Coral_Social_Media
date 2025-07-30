"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PersonaEditor } from "@/components/persona-editor"
import { PersonaPreview } from "@/components/persona-preview"
import { PersonaTemplates } from "@/components/persona-templates"
import { Save, Download, Upload, RotateCcw } from "lucide-react"
import { useRef } from "react"

export default function PersonaPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Persona Configuration" text="Configure the system's persona and tone.">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DashboardHeader>
      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 md:w-auto">
          <TabsTrigger value="editor" className="text-xs sm:text-sm">Editor</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm">Templates</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
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
