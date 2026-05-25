import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PaymentsList } from "@/components/payments-list"
import { CreditCard } from "lucide-react"

export default function PaymentsPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            Payments
          </span>
        }
        text="Track and manage all team payments and financial transactions"
      />
      <PaymentsList />
    </DashboardShell>
  )
}
