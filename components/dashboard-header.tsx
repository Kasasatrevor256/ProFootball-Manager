import type React from "react"
interface DashboardHeaderProps {
  heading: React.ReactNode
  text?: string
  children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2 py-4 sm:py-6">
      <div className="grid gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          {heading}
        </h1>
        {text && <p className="text-muted-foreground text-base sm:text-lg">{text}</p>}
      </div>
      {children && <div className="flex justify-start sm:justify-end">{children}</div>}
    </div>
  )
}
