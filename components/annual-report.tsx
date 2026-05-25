"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle, Calendar, Search, Download, TrendingUp } from "lucide-react"

// API configuration
const API_BASE_URL = ""

interface Player {
  id: string
  name: string
  phone: string
  annual: number
  monthly: number
  pitch: number
}

interface AnnualReportData {
  player: string
  totalAmount: number
  amountPaid: number
  balance: number
  carryover?: number // Only for 2025+
  lastPayment: string
  status: "Complete" | "Incomplete"
}

export function AnnualReport() {
  const [isLoading, setIsLoading] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [annualData, setAnnualData] = useState<AnnualReportData[]>([])
  const [selectedYear, setSelectedYear] = useState("2025")
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Generate years for selection
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - 1 + i
    return { value: year.toString(), label: year.toString() }
  })

  // Helper function to get auth headers
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

  // Calculate carryover from previous year (only for 2026+)
  const calculateCarryover = async (playerId: string, year: string): Promise<number> => {
    // Carryover system starts in 2025, so 2025 has no carryover
    // First year with carryover is 2026 (carrying from 2025)
    if (parseInt(year) <= 2025) return 0
    
    const previousYear = (parseInt(year) - 1).toString()
    
    try {
      // Get ALL payments using same approach as monthly report
      const response = await fetch(`${API_BASE_URL}/api/payments`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        console.log(`Failed to fetch payments: ${response.status}`)
        return 0
      }

      const paymentsResp = await response.json()
      const allPayments = paymentsResp.data ?? paymentsResp

      // Filter for this player's annual payments in the previous year
      const playerPayments = allPayments.filter((payment: any) => {
        const paymentYear = new Date(payment.date).getFullYear().toString()
        return payment.playerId === playerId &&
               paymentYear === previousYear &&
               payment.paymentType === "annual"
      })
      
      const player = players.find(p => p.id === playerId)
      if (!player) {
        console.log(`Player not found: ${playerId}`)
        return 0
      }

      const totalPaid = playerPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0)
      const annualObligation = player.annual // Base annual amount for previous year
      const balance = Math.max(0, annualObligation - totalPaid) // Only positive balances carry over
      
      // Enhanced logging
      if (balance > 0) {
        console.log(`🔄 CARRYOVER FOUND for ${player.name}:`)
        console.log(`Previous year (${previousYear}) obligation: UGX ${annualObligation.toLocaleString()}`)
        console.log(`Previous year payments: UGX ${totalPaid.toLocaleString()}`)
        console.log(`Carryover balance: UGX ${balance.toLocaleString()}`)
        console.log(`Payment dates found:`, playerPayments.map(p => p.date))
      } else if (totalPaid > 0) {
        console.log(`✅ ${player.name} - Fully paid ${previousYear} (UGX ${totalPaid.toLocaleString()})`)
      } else {
        console.log(`❌ ${player.name} - No payments found for ${previousYear}`)
      }
      
      return balance
    } catch (error) {
      console.error(`Error calculating carryover for player ${playerId}:`, error)
      return 0
    }
  }

  // Fetch annual subscription data from backend API
  const fetchAnnualData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use backend API that does all calculations
      const response = await fetch(`${API_BASE_URL}/api/reports/annual?year=${selectedYear}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch annual report: ${response.status}`)
      }

      const apiData = await response.json()

      // Transform backend data to match existing UI format
      const reportData: AnnualReportData[] = apiData.data.map((item: any) => {
        const reportEntry: AnnualReportData = {
          player: item.playerName,
          totalAmount: item.totalDue,
          amountPaid: item.amountPaid,
          balance: item.balance,
          lastPayment: item.lastPaymentDate ? new Date(item.lastPaymentDate).toLocaleDateString() : "-",
          status: item.status === "Complete" ? "Complete" : "Incomplete"
        }

        // Add carryover field only for 2026+
        if (parseInt(selectedYear) >= 2026 && item.carryover > 0) {
          reportEntry.carryover = item.carryover
        }

        return reportEntry
      })

      setAnnualData(reportData)
      
    } catch (error) {
      console.error("❌ Error fetching annual data:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load annual data"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when component mounts or year changes
  useEffect(() => {
    fetchAnnualData()
  }, [selectedYear])

  // Filter data based on search
  const filteredAnnualData = annualData.filter(row =>
    row.player.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Export to PDF function
  const exportToPDF = async () => {
    setIsLoading(true)
    
    try {
      const filteredData = filteredAnnualData

      const totals = {
        baseAmount: filteredData.reduce((sum, row) => sum + (parseInt(selectedYear) >= 2026 ? row.totalAmount - (row.carryover || 0) : row.totalAmount), 0),
        carryoverAmount: parseInt(selectedYear) >= 2026 ? filteredData.reduce((sum, row) => sum + (row.carryover || 0), 0) : 0,
        totalAmount: filteredData.reduce((sum, row) => sum + row.totalAmount, 0),
        amountPaid: filteredData.reduce((sum, row) => sum + row.amountPaid, 0),
        balance: filteredData.reduce((sum, row) => sum + row.balance, 0),
        completeCount: filteredData.filter(row => row.status === "Complete").length,
        incompleteCount: filteredData.filter(row => row.status === "Incomplete").length
      }

      // Check if this year has carryover
      const hasCarryover = parseInt(selectedYear) >= 2026 && totals.carryoverAmount > 0

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Annual Subscription Report - ${selectedYear}</title>
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
            <h1>Annual Subscription Report ${hasCarryover ? '📈' : ''}</h1>
            <p>Year: ${selectedYear} | Generated on ${new Date().toLocaleDateString()}</p>
            <p>Munyonyo Soccer Team - Financial Report</p>
          </div>

          ${hasCarryover ? `
          <div class="carryover-info">
            <strong>🔄 Annual Carryover System Active (Starting 2026)</strong><br>
            Unpaid annual balances from previous years are automatically carried forward.<br>
            <strong>Baseline:</strong> 2025 (no carryover) | <strong>Total Carryover from ${parseInt(selectedYear) - 1}:</strong> UGX ${totals.carryoverAmount.toLocaleString()}
          </div>
          ` : ''}

          <div class="summary">
            <h3>Summary Statistics</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <strong>Total Players:</strong><br>
                ${filteredData.length}
              </div>
              <div class="summary-item">
                <strong>Base Annual Amount:</strong><br>
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
                <strong>Collection Rate:</strong><br>
                ${totals.totalAmount > 0 ? ((totals.amountPaid / totals.totalAmount) * 100).toFixed(1) : 0}%
              </div>
              <div class="summary-item">
                <strong>Complete Payments:</strong><br>
                ${totals.completeCount} of ${filteredData.length} players
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Player Name</th>
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
              ${filteredData.map(row => {
                const baseAmount = parseInt(selectedYear) >= 2026 ? row.totalAmount - (row.carryover || 0) : row.totalAmount
                return `
                <tr>
                  <td><strong>${row.player}</strong></td>
                  <td class="amount">UGX ${baseAmount.toLocaleString()}</td>
                  ${hasCarryover ? `
                  <td class="amount">
                    ${row.carryover && row.carryover > 0 ? 
                      `<span class="carryover-amount">+UGX ${row.carryover.toLocaleString()}</span>` : 
                      '-'
                    }
                  </td>
                  ` : ''}
                  <td class="amount">UGX ${row.totalAmount.toLocaleString()}</td>
                  <td class="amount">UGX ${row.amountPaid.toLocaleString()}</td>
                  <td class="amount">UGX ${row.balance.toLocaleString()}</td>
                  <td>${row.lastPayment}</td>
                  <td>
                    <span class="status-${row.status.toLowerCase()}">
                      ${row.status}
                    </span>
                  </td>
                </tr>
              `}).join('')}
              <tr class="totals-row">
                <td><strong>TOTALS</strong></td>
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
            <p>Report includes annual subscription payments for ${selectedYear}</p>
            ${hasCarryover ? '<p><strong>Note:</strong> Annual carryover system active - unpaid balances carry forward year-to-year starting 2026</p>' : ''}
            ${parseInt(selectedYear) === 2025 ? '<p><strong>2025 Baseline Year:</strong> No carryover from previous years</p>' : ''}
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
          description: "Annual report has been prepared for printing/PDF export",
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
        description: "Failed to export annual report",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading annual data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAnnualData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalCarryover = parseInt(selectedYear) >= 2026 
    ? filteredAnnualData.reduce((sum, row) => sum + (row.carryover || 0), 0)
    : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Annual Subscription Report
            {parseInt(selectedYear) >= 2026 && <TrendingUp className="h-4 w-4 text-orange-500" />}
          </CardTitle>
          <CardDescription>
            Track annual subscription payments for the current year
            {parseInt(selectedYear) >= 2026 && " (with carryover from previous year)"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportToPDF} size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Carryover Alert for 2026+ */}
        {parseInt(selectedYear) >= 2026 && totalCarryover > 0 && (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-700">
              <strong>Carryover Impact:</strong> UGX {totalCarryover.toLocaleString()} in unpaid balances 
              from {parseInt(selectedYear) - 1} have been added to {selectedYear} obligations.
            </p>
          </div>
        )}

        {/* Debug Section for 2026+ */}
        {parseInt(selectedYear) >= 2026 && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <details>
              <summary className="text-sm font-medium text-yellow-800 cursor-pointer">
                🔍 Debug Carryover Calculations (Click to expand)
              </summary>
              <div className="mt-2 text-xs text-yellow-700">
                <p><strong>How to verify carryover:</strong></p>
                <ol className="list-decimal list-inside space-y-1 mt-1">
                  <li>Check browser console for detailed carryover logs</li>
                  <li>Verify {parseInt(selectedYear) - 1} payments match your records</li>
                  <li>Carryover = {parseInt(selectedYear) - 1} Obligation (UGX 150,000) - {parseInt(selectedYear) - 1} Payments</li>
                  <li>Only positive balances carry forward</li>
                </ol>
                <p className="mt-2"><strong>Expected:</strong> Players with incomplete {parseInt(selectedYear) - 1} payments should show carryover amounts in orange.</p>
              </div>
            </details>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                {parseInt(selectedYear) >= 2026 && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carryover
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnnualData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.player}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">UGX {row.totalAmount.toLocaleString()}</td>
                  {parseInt(selectedYear) >= 2026 && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.carryover && row.carryover > 0 ? (
                        <span className="text-orange-600 font-medium">+UGX {row.carryover.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">UGX {row.amountPaid.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">UGX {row.balance.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.lastPayment}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Badge
                      variant={row.status === "Complete" ? "default" : "destructive"}
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  UGX {filteredAnnualData.reduce((sum, row) => sum + row.totalAmount, 0).toLocaleString()}
                </td>
                {parseInt(selectedYear) >= 2026 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                    +UGX {totalCarryover.toLocaleString()}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  UGX {filteredAnnualData.reduce((sum, row) => sum + row.amountPaid, 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  UGX {filteredAnnualData.reduce((sum, row) => sum + row.balance, 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Carryover Information for 2026+ */}
        {parseInt(selectedYear) >= 2026 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Starting 2026, unpaid balances from previous years automatically carry over. 
              Total Amount = Base Annual Amount (UGX 150,000) + Previous Year Carryover.
              <br />
              <strong>2025 is the baseline year</strong> - no carryover from 2024 or earlier.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AnnualReport