"use client"

import { SetupWizard } from "@/components/setup-wizard"

export default function SetupPage() {
  
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center space-y-6 p-4 md:p-8">
        <div className="flex flex-col space-y-2 text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to Social Media Agent System
          </h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your system in a few simple steps
          </p>
        </div>
        <SetupWizard />
      </div>
    </div>
  )
}
