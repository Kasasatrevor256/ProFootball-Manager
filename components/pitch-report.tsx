"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Download, Calendar, Search, Loader2, AlertTriangle, TrendingUp } from "lucide-react"

// API configuration
const API_BASE_URL = ""

interface Player {
  id: string
  name: string
  phone: string
  annual: number
  monthly: number
  pitch: number
  createdAt: string
  updatedAt: string
}

interface Payment {
  id: string
  playerId: string
  playerName: string
  paymentType: string
  amount: number
  date: string
  createdAt: string
}

interface PitchReportData {
  player: Player
  month: string
  monthKey: string
  baseAmount: number
  carryoverAmount: number
  totalAmount: number
  amountPaid: number
  balance: number
  paymentCount: number
  lastPaymentDate: string | null
  status: "Complete" | "Incomplete"
}

export function PitchReport() {
  const [reportData, setReportData] = useState<PitchReportData[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("all")
  const { toast } = useToast()

  // Generate month options starting from July 2025 (pitch baseline)
  const generateMonthOptions = () => {
    const months = [
      { value: "all", label: "All Months" }
    ]
    
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Start from July 2025 (pitch carryover baseline)
    const startYear = 2025
    const startMonth = 6 // July (0-indexed)

    // Generate months from July 2025 to current month (or at least through July 2025)
    for (let year = startYear; year <= Math.max(currentYear, 2025); year++) {
      const monthStart = year === startYear ? startMonth : 0
      let monthEnd = year === currentYear ? currentMonth : 11
      
      // Ensure we include at least July 2025 even if current date is before July 2025
      if (year === 2025) {
        monthEnd = Math.max(monthEnd, 6) // Include at least through July (6 = July, 0-indexed)
      }
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const date = new Date(year, month, 1)
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        const value = `${year}-${String(month + 1).padStart(2, '0')}`
        months.push({ value, label: monthName })
      }
    }
    
    return months
  }

  const monthOptions = generateMonthOptions()

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

  // Check if carryover applies (August 2025 and onwards) - FIXED: July should NOT have carryover
  const shouldHaveCarryover = (monthKey: string): boolean => {
    const [year, month] = monthKey.split('-').map(Number)
    return year > 2025 || (year === 2025 && month >= 8) // August 2025 onwards (month 8, not 7)
  }

  // Get previous month key
  const getPreviousMonthKey = (monthKey: string): string => {
    const [year, month] = monthKey.split('-').map(Number)
    if (month === 1) {
      return `${year - 1}-12`
    } else {
      return `${year}-${String(month - 1).padStart(2, '0')}`
    }
  }

  // Calculate carryover from previous month
  const calculatePitchCarryover = async (playerId: string, monthKey: string, allPayments: Payment[]): Promise<number> => {
    if (!shouldHaveCarryover(monthKey)) return 0
    
    const previousMonthKey = getPreviousMonthKey(monthKey)
    const [prevYear, prevMonth] = previousMonthKey.split('-').map(Number)
    
    try {
      // Get previous month's payments for this player
      const prevMonthStart = new Date(prevYear, prevMonth - 1, 1)
      const prevMonthEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59)
      
      const previousMonthPayments = allPayments.filter(payment => {
        const paymentDate = new Date(payment.date)
        return payment.playerId === playerId && 
               payment.paymentType === "pitch" &&
               paymentDate >= prevMonthStart && 
               paymentDate <= prevMonthEnd
      })
      
      const player = players.find(p => p.id === playerId)
      if (!player) return 0

      const totalPaid = previousMonthPayments.reduce((sum, payment) => sum + payment.amount, 0)
      
      // Calculate previous month's carryover recursively
      const prevMonthCarryover = await calculatePitchCarryover(playerId, previousMonthKey, allPayments)
      const prevMonthObligation = player.pitch + prevMonthCarryover
      const balance = Math.max(0, prevMonthObligation - totalPaid)
      
      if (balance > 0) {
        console.log(`🔄 PITCH CARRYOVER for ${player.name} (${monthKey}):`)
        console.log(`Previous month (${previousMonthKey}) obligation: UGX ${prevMonthObligation.toLocaleString()}`)
        console.log(`Previous month payments: UGX ${totalPaid.toLocaleString()}`)
        console.log(`Carryover balance: UGX ${balance.toLocaleString()}`)
      }
      
      return balance
    } catch (error) {
      console.error(`Error calculating pitch carryover for player ${playerId}, month ${monthKey}:`, error)
      return 0
    }
  }

  // Function to fetch all payments with pagination
  const fetchAllPayments = async (): Promise<Payment[]> => {
    const allPayments: Payment[] = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      console.log(`🔄 Fetching payments: skip=${skip}, limit=${limit}`)
      const response = await fetch(`${API_BASE_URL}/api/payments?skip=${skip}&limit=${limit}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Payments fetch failed:", response.status, errorText)
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.")
        }
        throw new Error(`Failed to fetch payments: ${response.status} - ${errorText}`)
      }

      const payments: Payment[] = await response.json()
      allPayments.push(...payments)
      console.log(`✅ Fetched ${payments.length} payments (total: ${allPayments.length})`)
      
      hasMore = payments.length === limit
      skip += limit
    }

    return allPayments
  }

  // Load payments and players data with carryover
  const loadPitchPayments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("📊 Loading pitch report data from backend...")

      // Fetch report data from backend API
      const [year, month] = selectedMonth === "all" 
        ? [new Date().getFullYear(), "all"]
        : selectedMonth.split('-').map(Number)

      const response = await fetch(
        `${API_BASE_URL}/api/reports/pitch?year=${year}&month=${month}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.")
        }
        throw new Error(`Failed to fetch pitch report: ${response.status} - ${errorText}`)
      }

      const apiData = await response.json()
      console.log(`✅ Loaded report data for ${apiData.data.length} entries`)

      // Transform backend data to match frontend format
      const reportData: PitchReportData[] = apiData.data.map((item: any) => {
        const [yearStr, monthStr] = item.monthKey.split('-')
        const yearNum = parseInt(yearStr)
        const monthNum = parseInt(monthStr)
        const monthName = new Date(yearNum, monthNum - 1, 1)
          .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

        return {
          player: {
            id: item.playerId,
            name: item.playerName,
            phone: item.phone,
            pitch: item.expectedAmount,
          },
          month: monthName,
          monthKey: item.monthKey,
          baseAmount: item.expectedAmount,
          carryoverAmount: item.carryoverAmount,
          totalAmount: item.totalAmount,
          amountPaid: item.amountPaid,
          balance: item.balance,
          paymentCount: item.paymentCount,
          lastPaymentDate: item.lastPaymentDate,
          status: item.status
        }
      })

      // Sort by status (incomplete first) then by balance (highest first)
      reportData.sort((a, b) => {
        if (a.status === "Incomplete" && b.status === "Complete") return -1
        if (a.status === "Complete" && b.status === "Incomplete") return 1
        return b.balance - a.balance
      })

      setReportData(reportData)
      
    } catch (error) {
      console.error("❌ Error loading pitch report:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load pitch report"
      setError(errorMessage)
      
      toast({
        title: "Error loading pitch report",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when component mounts or month changes
  useEffect(() => {
    loadPitchPayments()
  }, [selectedMonth])

  // Filter data based on search
  const filteredData = reportData.filter(row =>
    row.player.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate totals for display
  const totals = {
    baseAmount: filteredData.reduce((sum, row) => sum + row.baseAmount, 0),
    carryoverAmount: filteredData.reduce((sum, row) => sum + row.carryoverAmount, 0),
    totalAmount: filteredData.reduce((sum, row) => sum + row.totalAmount, 0),
    amountPaid: filteredData.reduce((sum, row) => sum + row.amountPaid, 0),
    balance: filteredData.reduce((sum, row) => sum + row.balance, 0)
  }

  // Check if current selection has carryover
  const hasCarryover = filteredData.some(row => row.carryoverAmount > 0)
  const isCarryoverMonth = selectedMonth !== "all" && shouldHaveCarryover(selectedMonth)

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Export to PDF function
  const exportToPDF = async () => {
    setIsExportingPDF(true)
    
    try {
      const monthDisplay = selectedMonth === "all" ? "All Months" : 
        monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pitch Payment Report - ${monthDisplay}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #10b981;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #10b981;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #666;
            }
            .carryover-info {
              background: #fef3c7;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #f59e0b;
            }
            .summary {
              background: #f0fdf4;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              border-left: 4px solid #10b981;
            }
            .summary h3 {
              margin: 0 0 15px 0;
              color: #10b981;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
            }
            .summary-item {
              background: white;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #d1fae5;
            }
            .summary-item strong {
              color: #1e293b;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              background: white;
            }
            th, td { 
              padding: 12px; 
              text-align: left; 
              border-bottom: 1px solid #e2e8f0; 
            }
            th { 
              background-color: #f0fdf4; 
              font-weight: 600;
              color: #475569;
              border-bottom: 2px solid #bbf7d0;
            }
            tr:hover { 
              background-color: #f8fafc; 
            }
            .status-complete {
              background: #dcfce7;
              color: #166534;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
            }
            .status-incomplete {
              background: #fef2f2;
              color: #dc2626;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
            }
            .carryover-amount {
              color: #f59e0b;
              font-weight: 600;
            }
            .totals-row {
              font-weight: 600;
              background-color: #f0fdf4 !important;
              border-top: 2px solid #10b981;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            .amount {
              text-align: right;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pitch Payment Report ${hasCarryover ? '📈' : ''}</h1>
            <p>Period: ${monthDisplay} | Generated on ${new Date().toLocaleDateString()}</p>
            <p>Munyonyo Soccer Team - Financial Report</p>
          </div>

          ${hasCarryover ? `
          <div class="carryover-info">
            <strong>🔄 Pitch Carryover System Active (Starting August 2025)</strong><br>
            Unpaid pitch balances from previous months are automatically carried forward.<br>
            <strong>Baseline:</strong> July 2025 (no carryover) | <strong>Total Carryover:</strong> UGX ${totals.carryoverAmount.toLocaleString()}
          </div>
          ` : ''}

          <div class="summary">
            <h3>Summary Statistics</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <strong>Total Records:</strong><br>
                ${filteredData.length}
              </div>
              <div class="summary-item">
                <strong>Base Pitch Amount:</strong><br>
                UGX ${totals.baseAmount.toLocaleString()}
              </div>
              ${hasCarryover ? `
              <div class="summary-item">
                <strong>Total Carryover:</strong><br>
                <span class="carryover-amount">+UGX ${totals.carryoverAmount.toLocaleString()}</span>
              </div>
              ` : ''}
              <div class="summary-item">
                <strong>Total Expected:</strong><br>
                UGX ${totals.totalAmount.toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Total Collected:</strong><br>
                UGX ${totals.amountPaid.toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Outstanding Balance:</strong><br>
                UGX ${totals.balance.toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Payment Rate:</strong><br>
                ${totals.totalAmount > 0 ? ((totals.amountPaid / totals.totalAmount) * 100).toFixed(1) : 0}%
              </div>
              <div class="summary-item">
                <strong>Complete Payments:</strong><br>
                ${filteredData.filter(row => row.status === "Complete").length} records
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Month</th>
                <th>Phone</th>
                <th class="amount">Base Amount</th>
                ${hasCarryover ? '<th class="amount">Carryover</th>' : ''}
                <th class="amount">Total Amount</th>
                <th class="amount">Amount Paid</th>
                <th class="amount">Balance</th>
                <th>Last Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(row => `
                <tr>
                  <td><strong>${row.player.name}</strong></td>
                  <td>${row.month}</td>
                  <td>${row.player.phone}</td>
                  <td class="amount">UGX ${row.baseAmount.toLocaleString()}</td>
                  ${hasCarryover ? `
                  <td class="amount">
                    ${row.carryoverAmount > 0 ? 
                      `<span class="carryover-amount">+UGX ${row.carryoverAmount.toLocaleString()}</span>` : 
                      '-'
                    }
                  </td>
                  ` : ''}
                  <td class="amount">UGX ${row.totalAmount.toLocaleString()}</td>
                  <td class="amount">UGX ${row.amountPaid.toLocaleString()}</td>
                  <td class="amount">UGX ${row.balance.toLocaleString()}</td>
                  <td>${formatDate(row.lastPaymentDate)}</td>
                  <td>
                    <span class="status-${row.status.toLowerCase()}">
                      ${row.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td colspan="3"><strong>TOTALS</strong></td>
                <td class="amount"><strong>UGX ${totals.baseAmount.toLocaleString()}</strong></td>
                ${hasCarryover ? `
                <td class="amount">
                  <strong><span class="carryover-amount">+UGX ${totals.carryoverAmount.toLocaleString()}</span></strong>
                </td>
                ` : ''}
                <td class="amount"><strong>UGX ${totals.totalAmount.toLocaleString()}</strong></td>
                <td class="amount"><strong>UGX ${totals.amountPaid.toLocaleString()}</strong></td>
                <td class="amount"><strong>UGX ${totals.balance.toLocaleString()}</strong></td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated automatically by the Munyonyo Soccer Team Management System</p>
            <p>Report includes pitch payments for ${monthDisplay}</p>
            ${hasCarryover ? '<p><strong>Note:</strong> Pitch carryover system active - unpaid balances carry forward month-to-month starting August 2025</p>' : ''}
          </div>
        </body>
        </html>
      `

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.open()
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        printWindow.onload = () => {
          printWindow.print()
          printWindow.onafterprint = () => {
            printWindow.close()
          }
        }

        toast({
          title: "Export successful",
          description: "Pitch report has been prepared for printing/PDF export",
        })
      } else {
        toast({
          title: "Export failed",
          description: "Please allow pop-ups to export the report",
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Export failed",
        description: "Failed to export pitch report",
        variant: "destructive",
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pitch Payment Report</CardTitle>
          <CardDescription>Loading pitch payment data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pitch Payment Report</CardTitle>
          <CardDescription className="text-red-600">Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-300" />
            <p className="text-sm font-medium text-red-600 mb-2">Failed to Load Report</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <Button onClick={loadPitchPayments} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Pitch Payment Report
            {hasCarryover && <TrendingUp className="h-4 w-4 text-orange-500" />}
          </CardTitle>
          <CardDescription>
            Track monthly pitch rental payments by player
            {isCarryoverMonth && " (with carryover from previous month)"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={exportToPDF} 
            size="sm"
            disabled={isExportingPDF || isLoading || filteredData.length === 0}
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Carryover Alert for August 2025+ */}
        {hasCarryover && (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-700">
              <strong>Pitch Carryover Impact:</strong> UGX {totals.carryoverAmount.toLocaleString()} in unpaid balances 
              from previous months have been added to current month obligations.
            </p>
          </div>
        )}

        {/* Debug Section for August 2025+ */}
        {isCarryoverMonth && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <details>
              <summary className="text-sm font-medium text-yellow-800 cursor-pointer">
                🔍 Debug Pitch Carryover (Click to expand)
              </summary>
              <div className="mt-2 text-xs text-yellow-700">
                <p><strong>How pitch carryover works:</strong></p>
                <ol className="list-decimal list-inside space-y-1 mt-1">
                  <li>Check browser console for detailed carryover calculations</li>
                  <li>July 2025 = Baseline month (no carryover)</li>
                  <li>August 2025+ = Carries unpaid balance from previous month</li>
                  <li>Carryover = Previous Month Obligation - Previous Month Payments</li>
                  <li>Total Obligation = Base Pitch (UGX 5,000) + Carryover</li>
                </ol>
              </div>
            </details>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-blue-700">Total Records</h3>
            <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-green-700">Complete</h3>
            <p className="text-2xl font-bold text-green-900">{filteredData.filter(row => row.status === "Complete").length}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-red-700">Incomplete</h3>
            <p className="text-2xl font-bold text-red-900">{filteredData.filter(row => row.status === "Incomplete").length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-purple-700">Total Expected</h3>
            <p className="text-xl font-bold text-purple-900">UGX {formatAmount(totals.totalAmount)}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-indigo-700">Total Paid</h3>
            <p className="text-xl font-bold text-indigo-900">UGX {formatAmount(totals.amountPaid)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-orange-700">Total Balance</h3>
            <p className="text-xl font-bold text-orange-900">UGX {formatAmount(totals.balance)}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading pitch report data...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadPitchPayments} variant="outline">
                Retry Loading
              </Button>
            </div>
          </div>
        )}

        {/* Report Table */}
        {!isLoading && !error && (
          <>
            {filteredData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No Data Found</p>
                <p className="text-sm">
                  {searchTerm 
                    ? "No players match your search criteria."
                    : selectedMonth === "all" 
                      ? "No pitch payment data available from July 2025 onwards"
                      : "No pitch payment data available for this month"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Amount</th>
                      {hasCarryover && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Carryover
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((row, index) => (
                      <tr key={`${row.player.id}-${row.monthKey}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div>
                            <div className="font-medium">{row.player.name}</div>
                            <div className="text-gray-500 text-xs">{row.player.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          UGX {formatAmount(row.baseAmount)}
                        </td>
                        {hasCarryover && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.carryoverAmount > 0 ? (
                              <span className="text-orange-600 font-medium">
                                +UGX {formatAmount(row.carryoverAmount)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          UGX {formatAmount(row.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          UGX {formatAmount(row.amountPaid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={row.balance > 0 ? "text-red-600" : "text-green-600"}>
                            UGX {formatAmount(row.balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(row.lastPaymentDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <Badge variant={row.status === "Complete" ? "default" : "destructive"}>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-medium border-t-2">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        UGX {formatAmount(totals.baseAmount)}
                      </td>
                      {hasCarryover && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          +UGX {formatAmount(totals.carryoverAmount)}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        UGX {formatAmount(totals.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        UGX {formatAmount(totals.amountPaid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        UGX {formatAmount(totals.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {filteredData.filter(row => row.status === "Complete").length}/{filteredData.length} Complete
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Pitch Carryover Information */}
        {selectedMonth !== "all" && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Pitch Carryover System:</strong> {' '}
              {shouldHaveCarryover(selectedMonth) ? (
                <>
                  Starting August 2025, unpaid pitch balances automatically carry forward. 
                  Total Amount = Base Pitch Amount (UGX 5,000) + Previous Month Carryover.
                  <br />
                  <strong>July 2025 is the baseline month</strong> - no carryover from previous months.
                </>
              ) : (
                <>
                  July 2025 is the baseline month for pitch carryover system - no carryover applied.
                  <br />
                  <strong>Note:</strong> Pitch carryover starts from August 2025 onwards.
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}