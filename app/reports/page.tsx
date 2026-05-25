import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PaymentReports } from "@/components/payment-reports"
import { BarChart3 } from "lucide-react"

export default function ReportsPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Reports
          </span>
        }
        text="Comprehensive payment and financial reports"
      />
      <PaymentReports />
    </DashboardShell>
  )
}
