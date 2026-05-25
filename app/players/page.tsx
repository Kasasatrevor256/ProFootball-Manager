import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PlayersList } from "@/components/players-list"
import { Button } from "@/components/ui/button"
import { PlusCircle, Users } from "lucide-react"
import Link from "next/link"

export default function PlayersPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            Players
          </span>
        }
        text="Manage team players and their information"
      >
        <Link href="/players/form">
          <Button className="transition-all duration-150">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </Link>
      </DashboardHeader>
      <PlayersList />
    </DashboardShell>
  )
}
