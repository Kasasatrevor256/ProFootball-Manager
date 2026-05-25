"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, ArrowRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

const API_BASE_URL = ""

const PAYMENT_TYPE_STYLES: Record<string, string> = {
  annual:   'bg-blue-100 text-blue-800 border-blue-200',
  monthly:  'bg-purple-100 text-purple-800 border-purple-200',
  pitch:    'bg-green-100 text-green-800 border-green-200',
  matchday: 'bg-orange-100 text-orange-800 border-orange-200',
}

interface Payment {
  id: string
  playerName: string
  amount: number
  paymentType: "annual" | "monthly" | "pitch" | "matchday"
  date: string
  createdAt: string
}

export function RecentPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token")
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }
    return headers
  }

  useEffect(() => {
    const loadRecentPayments = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_BASE_URL}/api/payments?limit=10`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Failed to load recent payments")
        }

        const data = await response.json()
        setPayments(data.data ?? data)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load recent payments",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadRecentPayments()
  }, [toast])

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "annual": return "Annual"
      case "monthly": return "Monthly"
      case "pitch": return "Pitch"
      case "matchday": return "Match Day"
      default: return "Payment"
    }
  }

  const getUserInitials = (name: string | undefined) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card className="dashboard-card border-0 overflow-visible">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-white">Recent Payments</CardTitle>
              <CardDescription className="text-blue-100 text-sm mt-1">Loading recent payments...</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4" />
                </div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dashboard-card border-0 overflow-visible">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold text-white">Recent Payments</CardTitle>
            <CardDescription className="text-blue-100 text-sm mt-1">
              {payments.length > 0
                ? `${payments.length} most recent payments`
                : "No payments recorded yet."
              }
            </CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No payments yet</p>
            <p className="text-sm">Payments will appear here once recorded</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row sm:items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 gap-3"
                >
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm">
                      {getUserInitials(payment.playerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{payment.playerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('en-UG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1">
                    <div className="text-sm font-semibold tabular-nums">UGX {formatAmount(payment.amount)}</div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PAYMENT_TYPE_STYLES[payment.paymentType] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                    >
                      {getPaymentTypeLabel(payment.paymentType)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link
                href="/payments"
                className="flex items-center justify-end gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                View all payments
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
