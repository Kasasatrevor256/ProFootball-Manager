import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { UsersList } from "@/components/users-list"
import { UserCheck } from "lucide-react"

export default function UsersPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-blue-600" />
            Users
          </span>
        }
        text="Manage system users, roles, and permissions for your football management system"
      />
      <UsersList />
    </DashboardShell>
  )
}
