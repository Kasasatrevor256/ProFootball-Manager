"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Download, Calendar, Loader2, AlertTriangle, Search, FileText, DollarSign, Users, TrendingUp, Minus, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// API configuration
const API_BASE_URL = ""

interface Payment {
  id: string
  playerId: string
  playerName: string
  paymentType: "annual" | "monthly" | "pitch" | "matchday"
  amount: number
  date: string
  createdAt: string
}

interface Expense {
  id: string
  description: string
  category: string
  amount: number
  expense_date: string
  createdAt: string
}

interface DailyFinancialSummary {
  selectedDate: string
  payments: Payment[]
  expenses: Expense[]
  summary: {
    totalPayments: number
    totalExpenses: number
    netAmount: number
    paymentsCount: number
    expensesCount: number
    uniquePlayers: number
    paymentsByType: {
      annual: { count: number; amount: number }
      monthly: { count: number; amount: number }
      pitch: { count: number; amount: number }
      matchday: { count: number; amount: number }
    }
    expensesByCategory: Record<string, { count: number; amount: number }>
  }
}

export function DailyPaymentReport(){
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<DailyFinancialSummary | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)

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

  // Function to fetch all payments with pagination
  const fetchAllPayments = async (): Promise<Payment[]> => {
    const allPayments: Payment[] = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      const response = await fetch(`${API_BASE_URL}/api/payments?skip=${skip}&limit=${limit}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.")
        }
        throw new Error(`Failed to fetch payments: ${response.status} - ${errorText}`)
      }

      const payments: Payment[] = await response.json()
      allPayments.push(...payments)
      
      hasMore = payments.length === limit
      skip += limit
    }

    return allPayments
  }

  // Function to fetch all expenses with pagination
  const fetchAllExpenses = async (): Promise<Expense[]> => {
    const allExpenses: Expense[] = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/expenses?skip=${skip}&limit=${limit}`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Please log in again.")
          }
          throw new Error(`Failed to fetch expenses: ${response.status}`)
        }

        const expenses: Expense[] = await response.json()
        allExpenses.push(...expenses)
        
        hasMore = expenses.length === limit
        skip += limit
      } catch (error) {
        console.error("Error fetching expenses:", error)
        // If expenses endpoint fails, return empty array to show payments only
        break
      }
    }

    return allExpenses
  }

  // Generate daily financial report from backend API
  const generateDailyReport = async (date: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log(`📊 Generating daily financial report for ${date}`)

      // Fetch report data from backend API
      const response = await fetch(
        `${API_BASE_URL}/api/reports/daily?date=${date}`,
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
        throw new Error(`Failed to fetch daily report: ${response.status} - ${errorText}`)
      }

      const report: DailyFinancialSummary = await response.json()
      console.log(`✅ Loaded report with ${report.payments.length} payments and ${report.expenses.length} expenses`)

      setReportData(report)
      
    } catch (error) {
      console.error("❌ Error generating daily report:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate daily report"
      setError(errorMessage)
      
      toast({
        title: "Error generating daily report",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load report when date changes
  useEffect(() => {
    if (selectedDate) {
      generateDailyReport(selectedDate)
    }
  }, [selectedDate])

  // Filter payments and expenses based on search term
  const filteredPayments = reportData?.payments.filter(payment =>
    payment.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredExpenses = reportData?.expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return 'Annual Subscription'
      case 'monthly': return 'Monthly Subscription'
      case 'pitch': return 'Pitch Payment'
      case 'matchday': return 'Match Day Payment'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'annual': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'monthly': return 'bg-green-100 text-green-800 border-green-300'
      case 'pitch': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'matchday': return 'bg-orange-100 text-orange-800 border-orange-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getExpenseCategoryColor = (category: string) => {
    switch (category) {
      case 'Facilities': return 'bg-red-100 text-red-800 border-red-300'
      case 'Equipment': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'Food & Drinks': return 'bg-green-100 text-green-800 border-green-300'
      case 'Transport': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Medical': return 'bg-pink-100 text-pink-800 border-pink-300'
      case 'Officials': return 'bg-indigo-100 text-indigo-800 border-indigo-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Export to PDF function
  const handleExportPDF = () => {
    if (!reportData) return

    setIsExporting(true)

    setTimeout(() => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Daily Financial Report - ${formatDate(reportData.selectedDate)}</title>
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
            .net-positive {
              background: #dcfce7;
              border-color: #bbf7d0;
            }
            .net-negative {
              background: #fee2e2;
              border-color: #fecaca;
            }
            .net-zero {
              background: #f1f5f9;
              border-color: #cbd5e1;
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
            .totals-row {
              font-weight: 600;
              background-color: #f0fdf4 !important;
              border-top: 2px solid #10b981;
            }
            .amount {
              text-align: right;
              font-family: monospace;
            }
            .expense-row {
              background-color: #fef2f2;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              margin: 30px 0 15px 0;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Financial Report</h1>
            <p>Date: ${formatDate(reportData.selectedDate)} | Generated on ${new Date().toLocaleDateString()}</p>
            <p>Munyonyo Soccer Team - Financial Report</p>
          </div>

          <div class="summary">
            <h3>Daily Financial Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <strong>Total Income:</strong><br>
                UGX ${formatAmount(reportData.summary.totalPayments)}
              </div>
              <div class="summary-item">
                <strong>Total Expenses:</strong><br>
                UGX ${formatAmount(reportData.summary.totalExpenses)}
              </div>
              <div class="summary-item ${reportData.summary.netAmount > 0 ? 'net-positive' : reportData.summary.netAmount < 0 ? 'net-negative' : 'net-zero'}">
                <strong>Net Amount:</strong><br>
                UGX ${formatAmount(reportData.summary.netAmount)}
              </div>
              <div class="summary-item">
                <strong>Total Transactions:</strong><br>
                ${reportData.summary.paymentsCount + reportData.summary.expensesCount}
              </div>
            </div>
          </div>

          <h2 class="section-title">💰 Income (${reportData.summary.paymentsCount} payments)</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Player Name</th>
                <th>Payment Type</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map(payment => `
                <tr>
                  <td>${formatTime(payment.createdAt)}</td>
                  <td><strong>${payment.playerName}</strong></td>
                  <td>${getPaymentTypeLabel(payment.paymentType)}</td>
                  <td class="amount">UGX ${formatAmount(payment.amount)}</td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td colspan="3"><strong>TOTAL INCOME</strong></td>
                <td class="amount"><strong>UGX ${formatAmount(reportData.summary.totalPayments)}</strong></td>
              </tr>
            </tbody>
          </table>

          <h2 class="section-title">💸 Expenses (${reportData.summary.expensesCount} expenses)</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Description</th>
                <th>Category</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(expense => `
                <tr class="expense-row">
                  <td>${formatTime(expense.created_at)}</td>
                  <td><strong>${expense.description}</strong></td>
                  <td>${expense.category}</td>
                  <td class="amount">UGX ${formatAmount(expense.amount)}</td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td colspan="3"><strong>TOTAL EXPENSES</strong></td>
                <td class="amount"><strong>UGX ${formatAmount(reportData.summary.totalExpenses)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 2px solid #e2e8f0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Net Financial Position</h3>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${reportData.summary.netAmount > 0 ? '#059669' : reportData.summary.netAmount < 0 ? '#dc2626' : '#6b7280'};">
              UGX ${formatAmount(reportData.summary.netAmount)}
              ${reportData.summary.netAmount > 0 ? '(Profit)' : reportData.summary.netAmount < 0 ? '(Loss)' : '(Break Even)'}
            </p>
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
            setIsExporting(false)
          }
        }

        toast({
          title: "Export successful",
          description: "Daily financial report has been prepared for printing/PDF export",
        })
      } else {
        toast({
          title: "Export failed",
          description: "Please allow pop-ups to export the report",
          variant: "destructive",
        })
        setIsExporting(false)
      }
    }, 100)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading daily financial data...</p>
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
            <Button onClick={() => generateDailyReport(selectedDate)} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-2xl font-bold">Daily Financial Report</CardTitle>
          <CardDescription className="text-base">
            View all income and expenses for a specific date
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <Button 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting || !reportData}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExporting ? (
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
        {!reportData ? (
          <div className="text-center py-16 text-gray-500">
            <Calendar className="h-16 w-16 mx-auto mb-6 text-gray-300" />
            <p className="text-xl font-medium mb-2">Loading Report</p>
            <p className="text-base">Please wait while we generate the daily financial report.</p>
          </div>
        ) : (
          <div ref={printRef}>
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <Plus className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-sm font-medium text-green-700">Total Income</h3>
                    <p className="text-xl font-bold text-green-900">UGX {formatAmount(reportData.summary.totalPayments)}</p>
                    <p className="text-xs text-green-600">{reportData.summary.paymentsCount} payments</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <Minus className="h-8 w-8 text-red-600" />
                  <div>
                    <h3 className="text-sm font-medium text-red-700">Total Expenses</h3>
                    <p className="text-xl font-bold text-red-900">UGX {formatAmount(reportData.summary.totalExpenses)}</p>
                    <p className="text-xs text-red-600">{reportData.summary.expensesCount} expenses</p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${
                reportData.summary.netAmount > 0 
                  ? 'bg-green-50 border-green-200' 
                  : reportData.summary.netAmount < 0 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <DollarSign className={`h-8 w-8 ${
                    reportData.summary.netAmount > 0 
                      ? 'text-green-600' 
                      : reportData.summary.netAmount < 0 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`} />
                  <div>
                    <h3 className={`text-sm font-medium ${
                      reportData.summary.netAmount > 0 
                        ? 'text-green-700' 
                        : reportData.summary.netAmount < 0 
                          ? 'text-red-700' 
                          : 'text-gray-700'
                    }`}>Net Amount</h3>
                    <p className={`text-xl font-bold ${
                      reportData.summary.netAmount > 0 
                        ? 'text-green-900' 
                        : reportData.summary.netAmount < 0 
                          ? 'text-red-900' 
                          : 'text-gray-900'
                    }`}>UGX {formatAmount(reportData.summary.netAmount)}</p>
                    <p className={`text-xs ${
                      reportData.summary.netAmount > 0 
                        ? 'text-green-600' 
                        : reportData.summary.netAmount < 0 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                    }`}>
                      {reportData.summary.netAmount > 0 ? 'Profit' : reportData.summary.netAmount < 0 ? 'Loss' : 'Break Even'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-700">Total Transactions</h3>
                    <p className="text-2xl font-bold text-blue-900">{reportData.summary.paymentsCount + reportData.summary.expensesCount}</p>
                    <p className="text-xs text-blue-600">{reportData.summary.uniquePlayers} unique players</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments and expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Tabs for Payments and Expenses */}
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payments">Income ({reportData.summary.paymentsCount})</TabsTrigger>
                <TabsTrigger value="expenses">Expenses ({reportData.summary.expensesCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="payments" className="space-y-4">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Plus className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                    <p className="text-xl font-medium mb-2">
                      {searchTerm ? "No Matching Payments" : "No Payments Recorded"}
                    </p>
                    <p className="text-base">
                      {searchTerm 
                        ? "No payments match your search criteria for this date."
                        : `No payments were recorded on ${formatDate(selectedDate)}.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Time</TableHead>
                          <TableHead className="font-semibold">Player Name</TableHead>
                          <TableHead className="font-semibold">Payment Type</TableHead>
                          <TableHead className="text-right font-semibold">Amount</TableHead>
                        </TableRow>
                        </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {formatTime(payment.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.playerName}
                            </TableCell>
                            <TableCell>
                              <Badge className={getPaymentTypeColor(payment.paymentType)}>
                                {getPaymentTypeLabel(payment.paymentType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold font-mono">
                              UGX {formatAmount(payment.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-green-100 font-medium border-t-2">
                          <TableCell colSpan={3} className="font-bold">TOTAL INCOME</TableCell>
                          <TableCell className="text-right font-bold font-mono">
                            UGX {formatAmount(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="expenses" className="space-y-4">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Minus className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                    <p className="text-xl font-medium mb-2">
                      {searchTerm ? "No Matching Expenses" : "No Expenses Recorded"}
                    </p>
                    <p className="text-base">
                      {searchTerm 
                        ? "No expenses match your search criteria for this date."
                        : `No expenses were recorded on ${formatDate(selectedDate)}.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Time</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="text-right font-semibold">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense) => (
                          <TableRow key={expense.id} className="hover:bg-red-50">
                            <TableCell className="font-mono text-sm">
                              {formatTime(expense.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {expense.description}
                            </TableCell>
                            <TableCell>
                              <Badge className={getExpenseCategoryColor(expense.category)}>
                                {expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold font-mono">
                              UGX {formatAmount(expense.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-red-100 font-medium border-t-2">
                          <TableCell colSpan={3} className="font-bold">TOTAL EXPENSES</TableCell>
                          <TableCell className="text-right font-bold font-mono">
                            UGX {formatAmount(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Net Financial Summary */}
            <div className={`mt-6 p-6 rounded-lg border-2 ${
              reportData.summary.netAmount > 0 
                ? 'bg-green-50 border-green-200' 
                : reportData.summary.netAmount < 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className="text-lg font-semibold mb-4">Net Financial Position</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Income</p>
                  <p className="text-xl font-bold text-green-600">+ UGX {formatAmount(reportData.summary.totalPayments)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">- UGX {formatAmount(reportData.summary.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Amount</p>
                  <p className={`text-2xl font-bold ${
                    reportData.summary.netAmount > 0 
                      ? 'text-green-600' 
                      : reportData.summary.netAmount < 0 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    UGX {formatAmount(reportData.summary.netAmount)}
                  </p>
                  <p className={`text-sm ${
                    reportData.summary.netAmount > 0 
                      ? 'text-green-600' 
                      : reportData.summary.netAmount < 0 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    {reportData.summary.netAmount > 0 ? '✅ Profit' : reportData.summary.netAmount < 0 ? '❌ Loss' : '➖ Break Even'}
                  </p>
                </div>
              </div>
            </div>

            {/* Date Information */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Selected Date:</strong> {formatDate(selectedDate)}
                <br />
                <strong>Report Generated:</strong> {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}