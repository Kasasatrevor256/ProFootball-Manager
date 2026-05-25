import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ExpensesList } from "@/components/expenses-list"
import { Button } from "@/components/ui/button"
import { PlusCircle, Receipt } from "lucide-react"
import Link from "next/link"

export default function ExpensesPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <Receipt className="h-7 w-7 text-blue-600" />
            Expenses
          </span>
        }
        text="Track and manage team expenses"
      >
        <Link href="/expenses/new">
          <Button className="transition-all duration-150">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </DashboardHeader>
      <ExpensesList />
    </DashboardShell>
  )
}
