import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SettingsTabs } from "@/components/settings-tabs"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <Settings className="h-7 w-7 text-blue-600" />
            Settings
          </span>
        }
        text="Manage your account and system preferences"
      />
      <SettingsTabs />
    </DashboardShell>
  )
}
