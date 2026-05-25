"use client"

import dynamic from 'next/dynamic'
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { PaymentSummary } from "@/components/payment-summary"
import { Home } from "lucide-react"

// Lazy load heavy components with loading fallback
const RecentPayments = dynamic(() => import('@/components/recent-payments').then(mod => ({ default: mod.RecentPayments })), {
  loading: () => <div className="animate-pulse bg-gray-100 h-64 rounded-lg" />,
  ssr: false
})

const UpcomingPayments = dynamic(() => import('@/components/upcoming-payments').then(mod => ({ default: mod.UpcomingPayments })), {
  loading: () => <div className="animate-pulse bg-gray-100 h-64 rounded-lg" />,
  ssr: false
})

const ExpenseSummary = dynamic(() => import('@/components/expense-summary').then(mod => ({ default: mod.ExpenseSummary })), {
  loading: () => <div className="animate-pulse bg-gray-100 h-48 rounded-lg" />,
  ssr: false
})

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading={
          <span className="flex items-center gap-2">
            <Home className="h-7 w-7 text-blue-600" />
            Dashboard
          </span>
        }
        text="Overview of team finances and activities"
      />

      {/* Payment Summary Cards - Loads first (most important) */}
      <PaymentSummary />

      {/* Recent Payments and Upcoming Payments - Lazy loaded */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 mt-4">
        <div className="lg:col-span-4">
          <RecentPayments />
        </div>
        <div className="lg:col-span-3">
          <UpcomingPayments />
        </div>
      </div>

      {/* Recent Expenses - Lazy loaded */}
      <div className="mt-4">
        <ExpenseSummary />
      </div>
    </DashboardShell>
  )
}
