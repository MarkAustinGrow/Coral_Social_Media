"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface CoralIconProps {
  className?: string
}

export function CoralIcon({ className = "h-5 w-5" }: CoralIconProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show a placeholder during SSR/hydration to avoid layout shift
  if (!mounted) {
    return <div className={className} />
  }

  const isDark = resolvedTheme === "dark"
  const iconSrc = isDark ? "/coral-dark.png" : "/coral-light.png"
  const altText = `Coral ${isDark ? "Dark" : "Light"} Icon`

  return (
    <img
      src={iconSrc}
      alt={altText}
      className={className}
      style={{ width: '20px', height: '20px' }}
    />
  )
}
