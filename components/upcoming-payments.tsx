"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Users, Loader2, Calendar, CreditCard, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

// API configuration
const API_BASE_URL = ""

interface Player {
  id: string
  name: string
  phone: string
  annual: number
  monthly: number
  pitch: number
  match_day: number | null
  createdAt: string
  updatedAt: string
}

interface Payment {
  id: string
  playerId: string
  playerName: string
  paymentType: "annual" | "monthly" | "pitch" | "matchday"
  amount: number
  date: string
  createdAt: string
  updatedAt: string
}

interface PlayerPaymentStatus {
  player: Player
  lastPayment: Payment | null
  isDue: boolean
  isOverdue: boolean
  daysOverdue: number
  expectedAmount: number
  paymentType: "annual" | "monthly" | "pitch" | "matchday"
  nextDueDate: Date | null
  status: "up_to_date" | "due_soon" | "overdue"
}

export function UpcomingPayments() {
  const [playersWithStatus, setPlayersWithStatus] = useState<PlayerPaymentStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
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

  // Calculate payment status for a player (Updated for July 2024+ requirements)
const calculatePaymentStatus = (player: Player, payments: Payment[]): PlayerPaymentStatus => {
  const playerPayments = payments.filter(p => p.playerId === player.id)
  const lastPayment = playerPayments.length > 0 
    ? playerPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  const currentDate = now.getDate()
  
  let isDue = false
  let isOverdue = false
  let daysOverdue = 0
  let expectedAmount = player.monthly
  let paymentType: PlayerPaymentStatus["paymentType"] = "monthly"
  let nextDueDate: Date | null = null
  let status: PlayerPaymentStatus["status"] = "up_to_date"

  // Determine the system start: July 2025 for new system
  const systemStartYear = 2025
  const systemStartMonth = 7 // July
  
  // Force new system logic to be active immediately (June 2025 onwards)
  // This ensures we use July-based fiscal year calculations right away
  const isNewSystem = (currentYear >= systemStartYear)

  if (isNewSystem) {
    // New logic for 2025 onwards - July-June fiscal year
    console.log(`📅 Using new fiscal year system (July-June cycle)`)
    
    // Calculate fiscal year and month position
    // July 2025 = Year 1, Month 1 of new system
    let fiscalYear, fiscalMonth
    
    if (currentMonth >= 7) {
      // July-December: same calendar year
      fiscalYear = currentYear - systemStartYear + 1
      fiscalMonth = currentMonth - 6 // July=1, Aug=2, ..., Dec=6
    } else {
      // January-June: previous calendar year + 6 months
      fiscalYear = currentYear - systemStartYear
      fiscalMonth = currentMonth + 6 // Jan=7, Feb=8, ..., June=12
    }
    
    console.log(`📊 Fiscal Year ${fiscalYear}, Month ${fiscalMonth} of fiscal cycle`)
    
    // Skip processing for June 2025 and earlier - no payments due yet
    if (currentYear === 2025 && currentMonth <= 6) {
      console.log(`⏭️ Skipping June 2025 - fiscal year starts July 2025`)
      // Set all to not due for June 2025
      isDue = false
      isOverdue = false
      status = "up_to_date"
      return {
        player,
        lastPayment,
        isDue,
        isOverdue,
        daysOverdue,
        expectedAmount,
        paymentType,
        nextDueDate: new Date(2025, 6, 31), // July 31, 2025
        status
      }
    }
    
    // Get all payments for current fiscal year (July to June)
    const fiscalYearStart = currentMonth >= 7 ? 
      new Date(currentYear, 6, 1) :     // July 1st of current year if we're in July-Dec
      new Date(currentYear - 1, 6, 1)  // July 1st of previous year if we're in Jan-June
    
    const fiscalYearPayments = playerPayments.filter(p => {
      const paymentDate = new Date(p.date)
      return paymentDate >= fiscalYearStart
    })
    
    // Get current month payments
    const currentMonthPayments = fiscalYearPayments.filter(p => {
      const paymentDate = new Date(p.date)
      return paymentDate.getMonth() + 1 === currentMonth && 
             paymentDate.getFullYear() === currentYear
    })

    // Calculate monthly payment status
    const monthlyPayments = currentMonthPayments.filter(p => p.paymentType === "monthly")
    const pitchPayments = currentMonthPayments.filter(p => p.paymentType === "pitch")
    
    const totalMonthlyPaid = monthlyPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalPitchPaid = pitchPayments.reduce((sum, p) => sum + p.amount, 0)

    // Check if monthly and pitch payments are complete for current month
    const monthlyComplete = totalMonthlyPaid >= player.monthly
    const pitchComplete = totalPitchPaid >= player.pitch

    // June special check for annual payments (end of July-June fiscal year)
    if (currentMonth === 6) {
      const annualPayments = fiscalYearPayments.filter(p => p.paymentType === "annual")
      const totalAnnualPaid = annualPayments.reduce((sum, p) => sum + p.amount, 0)
      const annualComplete = totalAnnualPaid >= player.annual

      if (!annualComplete) {
        isDue = true
        isOverdue = false
        expectedAmount = player.annual - totalAnnualPaid
        paymentType = "annual"
        status = "due_soon"
        
        // Set next due date to end of June (end of fiscal year)
        nextDueDate = new Date(currentYear, 5, 30) // June 30th
      }
    }

    // Monthly payment deadline checks
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const daysUntilEndOfMonth = daysInMonth - currentDate

    // 15 days before end of month - list players who haven't cleared anything
    if (daysUntilEndOfMonth <= 15 && daysUntilEndOfMonth > 7) {
      if (!monthlyComplete && !pitchComplete) {
        isDue = true
        isOverdue = false
        expectedAmount = player.monthly + player.pitch - (totalMonthlyPaid + totalPitchPaid)
        paymentType = "monthly"
        status = "due_soon"
        
        nextDueDate = new Date(currentYear, currentMonth - 1, daysInMonth) // End of current month
      }
    }

    // 7 days before end of month - list players without full payment
    if (daysUntilEndOfMonth <= 7 && daysUntilEndOfMonth >= 0) {
      if (!monthlyComplete || !pitchComplete) {
        isDue = true
        isOverdue = daysUntilEndOfMonth < 0
        
        // Calculate remaining amount needed
        let remainingAmount = 0
        if (!monthlyComplete) remainingAmount += (player.monthly - totalMonthlyPaid)
        if (!pitchComplete) remainingAmount += (player.pitch - totalPitchPaid)
        
        expectedAmount = remainingAmount
        paymentType = !monthlyComplete ? "monthly" : "pitch"
        status = isOverdue ? "overdue" : "due_soon"
        
        nextDueDate = new Date(currentYear, currentMonth - 1, daysInMonth) // End of current month
        
        if (isOverdue) {
          daysOverdue = Math.abs(daysUntilEndOfMonth)
        }
      }
    }

    // If end of month has passed and payments incomplete
    if (daysUntilEndOfMonth < 0) {
      if (!monthlyComplete || !pitchComplete) {
        isDue = true
        isOverdue = true
        daysOverdue = Math.abs(daysUntilEndOfMonth)
        
        let remainingAmount = 0
        if (!monthlyComplete) remainingAmount += (player.monthly - totalMonthlyPaid)
        if (!pitchComplete) remainingAmount += (player.pitch - totalPitchPaid)
        
        expectedAmount = remainingAmount
        paymentType = !monthlyComplete ? "monthly" : "pitch"
        status = "overdue"
      }
    }

  } else {
    // Original logic for before July 2025
    console.log(`📅 Using original system logic (before July ${systemStartYear})`)
    
    if (lastPayment) {
      const lastPaymentDate = new Date(lastPayment.date)
      const daysSinceLastPayment = Math.floor((now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine payment schedule based on last payment type
      switch (lastPayment.payment_type) {
        case "monthly":
          nextDueDate = new Date(lastPaymentDate)
          nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          
          if (daysSinceLastPayment >= 30) {
            isDue = true
            isOverdue = daysSinceLastPayment > 35
            daysOverdue = Math.max(0, daysSinceLastPayment - 30)
            expectedAmount = player.monthly
            paymentType = "monthly"
          }
          break
          
        case "annual":
          nextDueDate = new Date(lastPaymentDate)
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
          
          if (daysSinceLastPayment >= 365) {
            isDue = true
            isOverdue = daysSinceLastPayment > 380
            daysOverdue = Math.max(0, daysSinceLastPayment - 365)
            expectedAmount = player.annual
            paymentType = "annual"
          }
          break
          
        case "pitch":
          // Pitch payments are more frequent, check weekly
          if (daysSinceLastPayment >= 7) {
            isDue = true
            isOverdue = daysSinceLastPayment > 14
            daysOverdue = Math.max(0, daysSinceLastPayment - 7)
            expectedAmount = player.pitch
            paymentType = "pitch"
          }
          break
          
        case "matchday":
          // Match day payments are event-based, less predictable
          if (daysSinceLastPayment >= 14) {
            isDue = true
            isOverdue = daysSinceLastPayment > 21
            daysOverdue = Math.max(0, daysSinceLastPayment - 14)
            expectedAmount = player.match_day || player.pitch
            paymentType = "matchday"
          }
          break
      }
    } else {
      // No payments yet - player needs initial payment
      const daysSinceRegistration = Math.floor((now.getTime() - new Date(player.created_at).getTime()) / (1000 * 60 * 60 * 24))
      isDue = true
      isOverdue = daysSinceRegistration > 7
      daysOverdue = Math.max(0, daysSinceRegistration - 3)
      expectedAmount = player.monthly
      paymentType = "monthly"
      
      nextDueDate = new Date(player.created_at)
      nextDueDate.setDate(nextDueDate.getDate() + 7)
    }

    // Determine overall status for original logic
    if (isOverdue) {
      status = "overdue"
    } else if (isDue) {
      status = "due_soon"
    } else {
      status = "up_to_date"
    }

    // Check if payment is due within next 7 days for original logic
    if (nextDueDate && !isDue) {
      const daysUntilDue = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        isDue = true
        status = "due_soon"
      }
    }
  }

  return {
    player,
    lastPayment,
    isDue,
    isOverdue,
    daysOverdue,
    expectedAmount,
    paymentType,
    nextDueDate,
    status
  }
}
  

  const loadUpcomingPayments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("🔍 Loading players and payments for upcoming payments analysis...")
      
      // Fetch players and payments
      const [playersResponse, paymentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/players?limit=100`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/payments?limit=100`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        })
      ])

      console.log("📡 Players response:", playersResponse.status)
      console.log("📡 Payments response:", paymentsResponse.status)

      if (!playersResponse.ok) {
        const errorText = await playersResponse.text()
        console.error("❌ Players API Error:", errorText)
        throw new Error(`Failed to load players: ${playersResponse.status}`)
      }

      if (!paymentsResponse.ok) {
        const errorText = await paymentsResponse.text()
        console.error("❌ Payments API Error:", errorText)
        throw new Error(`Failed to load payments: ${paymentsResponse.status}`)
      }

      const playersResp = await playersResponse.json()
      const paymentsResp = await paymentsResponse.json()
      const players: Player[] = playersResp.data ?? playersResp
      const payments: Payment[] = paymentsResp.data ?? paymentsResp

      console.log("✅ Loaded:", players.length, "players and", payments.length, "payments")

      // Calculate payment status for each player
      const playersWithPaymentStatus = players.map(player => 
        calculatePaymentStatus(player, payments)
      )

      // Filter to show only players with due/overdue payments or upcoming due dates
      const relevantPayments = playersWithPaymentStatus.filter(p => 
        p.isDue || p.isOverdue || p.status !== "up_to_date"
      )
      
      // Sort by priority: overdue first, then due soon, then by days overdue/upcoming
      relevantPayments.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue
        if (a.isDue && !b.isDue) return -1
        if (!a.isDue && b.isDue) return 1
        return 0
      })

      console.log("📊 Found", relevantPayments.length, "players with relevant payment status")
      setPlayersWithStatus(relevantPayments.slice(0, 10)) // Show top 10
      setLastRefresh(new Date())
      
    } catch (error) {
      console.error("❌ Error loading upcoming payments:", error)
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
      
      toast({
        title: "Error Loading Payment Status",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUpcomingPayments()
  }, [])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (playerStatus: PlayerPaymentStatus) => {
    switch (playerStatus.status) {
      case "overdue":
        return (
          <Badge variant="destructive" className="self-start">
            {playerStatus.daysOverdue > 0 ? `${playerStatus.daysOverdue}d overdue` : "Overdue"}
          </Badge>
        )
      case "due_soon":
        return (
          <Badge variant="outline" className="self-start border-orange-300 text-orange-700">
            Due Soon
          </Badge>
        )
      default:
        return (
          <Badge variant="default" className="self-start">
            Up to Date
          </Badge>
        )
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "annual": return "Annual Subscription"
      case "monthly": return "Monthly Subscription" 
      case "pitch": return "Pitch Payment"
      case "matchday": return "Match Day Payment"
      default: return "Payment"
    }
  }

  const overdueCount = playersWithStatus.filter(p => p.isOverdue).length
  const dueSoonCount = playersWithStatus.filter(p => p.isDue && !p.isOverdue).length

  if (isLoading) {
    return (
      <Card className="dashboard-card border-0 overflow-visible">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg sm:text-xl font-bold">Upcoming Payments</CardTitle>
          <CardDescription className="text-sm mt-1">Loading payment status...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="dashboard-card border-0 overflow-visible">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg sm:text-xl font-bold">Upcoming Payments</CardTitle>
          <CardDescription className="text-sm mt-1 text-red-600">Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-300" />
            <p className="text-sm font-medium text-red-600 mb-2">Failed to Load Payment Status</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <Button 
              onClick={loadUpcomingPayments} 
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
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
            <CardTitle className="text-lg sm:text-xl font-bold">Upcoming Payments</CardTitle>
            <CardDescription className="text-sm mt-1">
              {playersWithStatus.length > 0 
                ? `${overdueCount} overdue, ${dueSoonCount} due soon`
                : "All players are up to date with payments"
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 ? (
              <div className="h-8 px-3 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-3 w-3 text-red-600 mr-1" />
                <span className="text-red-600 font-medium text-xs">{overdueCount} overdue</span>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            )}
            <Button
              onClick={loadUpcomingPayments}
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {playersWithStatus.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-green-300" />
            <p className="text-lg font-medium mb-2 text-green-600">All caught up!</p>
            <p className="text-sm mb-4">No outstanding payments at the moment</p>
            <div className="text-xs text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {playersWithStatus.map((playerStatus) => (
              <div
                key={playerStatus.player.id}
                className="flex flex-col sm:flex-row p-4 rounded-lg border hover:bg-gray-50 transition-colors gap-3"
              >
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <Link 
                      href={`/players/${playerStatus.player.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {playerStatus.player.name}
                    </Link>
                    {getStatusBadge(playerStatus)}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {playerStatus.lastPayment 
                        ? `Last: ${new Date(playerStatus.lastPayment.date).toLocaleDateString('en-UG', {
                            month: 'short',
                            day: 'numeric'
                          })}`
                        : "No previous payments"
                      }
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Expected: {getPaymentTypeLabel(playerStatus.paymentType)}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    Phone: {playerStatus.player.phone}
                  </div>
                </div>
                
                <div className="flex sm:flex-col justify-between sm:justify-center items-end sm:items-end gap-2 sm:gap-1">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      playerStatus.isOverdue ? "text-red-600" : 
                      playerStatus.isDue ? "text-orange-600" : "text-green-600"
                    }`}>
                      UGX {formatAmount(playerStatus.expectedAmount)}
                    </div>
                    {playerStatus.isOverdue && playerStatus.daysOverdue > 0 && (
                      <div className="text-xs text-red-500">
                        {playerStatus.daysOverdue} days overdue
                      </div>
                    )}
                    {!playerStatus.isOverdue && playerStatus.nextDueDate && (
                      <div className="text-xs text-gray-500">
                        Due: {playerStatus.nextDueDate.toLocaleDateString('en-UG', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                  
                  <Link href="/payments/new">
                    <Button size="sm" variant="outline" className="text-xs">
                      Record Payment
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            
            <div className="text-center pt-4 border-t">
              <div className="text-xs text-gray-400 mb-2">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <Link href="/payments">
                <Button variant="outline" size="sm">
                  View All Payments
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}