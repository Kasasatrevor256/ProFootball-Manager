"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// API configuration
const API_BASE_URL = ""

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

  // Helper function to get session headers
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
        setPayments(data)
      } catch (error) {
        console.error("Error loading recent payments:", error)
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
      case "annual":
        return "Annual Subscription"
      case "monthly":
        return "Monthly Subscription"
      case "pitch":
        return "Pitch Payment"
      case "matchday":
        return "Match Day Payment"
      default:
        return "Payment"
    }
  }

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "annual":
        return "bg-blue-100 text-blue-800"
      case "monthly":
        return "bg-green-100 text-green-800"
      case "pitch":
        return "bg-purple-100 text-purple-800"
      case "matchday":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
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
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg sm:text-xl font-bold">Recent Payments</CardTitle>
          <CardDescription className="text-sm mt-1">Loading recent payments...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dashboard-card border-0 overflow-visible">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold">Recent Payments</CardTitle>
            <CardDescription className="text-sm mt-1">
              {payments.length > 0 
                ? `You have received ${payments.length} recent payments.`
                : "No payments recorded yet."
              }
            </CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-600" />
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
          <div className="space-y-6">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col sm:flex-row sm:items-center p-3 rounded-lg hover:bg-gray-50 transition-colors gap-3"
              >
                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm">
                    {getUserInitials(payment.playerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none">{payment.playerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {getPaymentTypeLabel(payment.paymentType)}
                  </p>
                </div>
                <div className="font-medium text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 sm:gap-0">
                  <div className="text-sm">UGX {formatAmount(payment.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString('en-UG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <Badge
                  className={`self-start sm:self-center ${getPaymentTypeColor(payment.paymentType)}`}
                  variant="secondary"
                >
                  {payment.paymentType}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}