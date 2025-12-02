"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Download, Calendar, Loader2, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// API configuration
const API_BASE_URL = ""

interface Player {
  id: string
  name: string
  phone: string
  annual: number
  monthly: number
  pitch: number
  match_day?: number
}

interface MatchDay {
  id: string
  match_date: string
  opponent: string | null
  venue: string | null
  match_type: string
}

interface Payment {
  id: string
  playerId: string
  playerName: string
  paymentType: "annual" | "monthly" | "pitch" | "matchday"
  amount: number
  date: string
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  match_day_id: string
  match_day_date: string | null
  match_day_opponent: string | null
  match_day_venue: string | null
}

interface PlayerContribution {
  player: Player
  matchDayPayment: number
  contributed: boolean
}

interface MatchDayReport {
  matchDay: MatchDay
  playerContributions: PlayerContribution[]
  expenses: Expense[]
  totals: {
    totalPlayerContributions: number
    totalExpenses: number
    netAmount: number
    contributingPlayers: number
    totalPlayers: number
    contributionRate: number
  }
}

export function MatchDayReport() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matchDays, setMatchDays] = useState<MatchDay[]>([])
  const [selectedMatchDay, setSelectedMatchDay] = useState<string>("")
  const [reportData, setReportData] = useState<MatchDayReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
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

  // Load match days and players
  useEffect(() => {
    loadInitialData()
  }, [])

  // Generate report when match day is selected
  useEffect(() => {
    if (selectedMatchDay) {
      generateMatchDayReport(selectedMatchDay)
    } else {
      setReportData(null)
    }
  }, [selectedMatchDay, players])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      
      const [playersRes, matchDaysRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/players?limit=100`, {
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/match-days?limit=100`, {
          headers: getAuthHeaders(),
          credentials: "include",
        })
      ])

      if (!playersRes.ok || !matchDaysRes.ok) {
        throw new Error("Failed to load initial data")
      }

      const playersData = await playersRes.json()
      const matchDaysData = await matchDaysRes.json()

      setPlayers(playersData)
      setMatchDays(matchDaysData.sort((a: MatchDay, b: MatchDay) => 
        new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      ))

      // Auto-select the most recent match day
      if (matchDaysData.length > 0) {
        setSelectedMatchDay(matchDaysData[0].id)
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
      toast({
        title: "Error",
        description: "Failed to load match days and players",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateMatchDayReport = async (matchDayId: string) => {
    try {
      const selectedMatchDayData = matchDays.find(md => md.id === matchDayId)
      if (!selectedMatchDayData) return

      // Fetch report data from backend API
      const response = await fetch(
        `${API_BASE_URL}/api/reports/match-day?match_day_id=${matchDayId}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to load match day report")
      }

      const apiData = await response.json()

      // Transform backend data to match frontend format
      const playerContributions: PlayerContribution[] = players.map(player => {
        const payments = apiData.payments || []
        const playerPayment = payments.find((p: any) => 
          p.playerId === player.id
        )
        
        return {
          player,
          matchDayPayment: playerPayment ? playerPayment.amount : 0,
          contributed: !!playerPayment
        }
      })

      const expenses: Expense[] = (apiData.expenses || []).map((e: any) => ({
        id: e.id,
        description: e.description || '',
        category: e.category,
        amount: e.amount,
        expense_date: e.expense_date || selectedMatchDayData.match_date,
        createdAt: e.created_at || '',
      }))

      const totalPlayerContributions = apiData.totalPayments || 0
      const totalExpenses = apiData.totalExpenses || 0
      const netAmount = apiData.netBalance || 0
      const contributingPlayers = playerContributions.filter(pc => pc.contributed).length
      const contributionRate = players.length > 0 ? (contributingPlayers / players.length) * 100 : 0

      const report: MatchDayReport = {
        matchDay: selectedMatchDayData,
        playerContributions,
        expenses,
        totals: {
          totalPlayerContributions,
          totalExpenses,
          netAmount,
          contributingPlayers,
          totalPlayers: players.length,
          contributionRate
        }
      }

      setReportData(report)
    } catch (error) {
      console.error("Error generating match day report:", error)
      toast({
        title: "Error",
        description: "Failed to generate match day report",
        variant: "destructive",
      })
    }
  }

  const handleExportPDF = () => {
    if (!reportData) return

    setIsExporting(true)

    setTimeout(() => {
      const content = printRef.current
      if (!content) {
        setIsExporting(false)
        return
      }

      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast({
          title: "Export Failed",
          description: "Please allow pop-ups to export the report as PDF",
          variant: "destructive",
        })
        setIsExporting(false)
        return
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Match Day Financial Report - ${formatDate(reportData.matchDay.match_date)}</title>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #1a202c;
                background: white;
                padding: 20px;
              }
              
              .report-container {
                max-width: 800px;
                margin: 0 auto;
              }
              
              .header { 
                text-align: center; 
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #2563eb;
              }
              
              .header h1 { 
                color: #1e40af;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
              }
              
              .header .subtitle {
                color: #64748b;
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 4px;
              }
              
              .header .date {
                color: #64748b;
                font-size: 14px;
              }

              .match-details {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 32px;
                text-align: center;
              }
              
              .match-details h2 {
                color: #1e40af;
                font-size: 22px;
                font-weight: 700;
                margin-bottom: 12px;
              }
              
              .match-info {
                display: flex;
                justify-content: center;
                gap: 32px;
                flex-wrap: wrap;
                margin-top: 16px;
              }
              
              .match-info-item {
                text-align: center;
              }
              
              .match-info-label {
                color: #64748b;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
                margin-bottom: 4px;
              }
              
              .match-info-value {
                color: #1e40af;
                font-size: 14px;
                font-weight: 600;
              }

              .summary-section {
                margin-bottom: 32px;
              }

              .section {
                margin-bottom: 32px;
                page-break-inside: avoid;
              }
              
              .section-title {
                color: #1e40af;
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
              }

              table { 
                width: 100%; 
                border-collapse: collapse;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              
              th { 
                background: #f1f5f9;
                color: #374151;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 16px 12px;
                text-align: left;
                border-bottom: 2px solid #e2e8f0;
              }
              
              th.center { text-align: center; }
              
              td { 
                padding: 14px 12px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 12px;
              }
              
              tr:last-child td {
                border-bottom: none;
              }
              
              tr:nth-child(even) {
                background: #fafbfc;
              }
              
              .player-name {
                font-weight: 600;
                color: #1a202c;
              }
              
              .phone-number {
                color: #64748b;
                font-family: monospace;
              }
              
              .amount {
                text-align: right;
                font-weight: 600;
                font-family: monospace;
              }
              
              .amount.paid {
                color: #059669;
              }
              
              .amount.unpaid {
                color: #94a3b8;
              }
              
              .status-cell {
                text-align: center;
              }
              
              .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              
              .status-badge.paid {
                background: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
              }
              
              .status-badge.unpaid {
                background: #f3f4f6;
                color: #6b7280;
                border: 1px solid #d1d5db;
              }
              
              .totals-row {
                background: #f1f5f9 !important;
                border-top: 2px solid #e2e8f0;
              }
              
              .totals-row td {
                font-weight: 700;
                color: #1e40af;
              }

              .final-result {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 32px;
                text-align: center;
                margin-top: 32px;
              }
              
              .final-result.profit {
                border-color: #10b981;
                background: #f0fdf4;
              }
              
              .final-result.loss {
                border-color: #ef4444;
                background: #fef2f2;
              }
              
              .final-result h3 {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 8px;
              }
              
              .final-result.profit h3 {
                color: #065f46;
              }
              
              .final-result.loss h3 {
                color: #991b1b;
              }
              
              .final-result p {
                color: #64748b;
                font-size: 13px;
              }

              .no-expenses {
                text-align: center;
                padding: 32px;
                color: #64748b;
                font-style: italic;
              }

              @media print {
                body { padding: 10px; }
                .section { page-break-inside: avoid; }
                .summary-grid { page-break-inside: avoid; }
                table { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="report-container">
              <div class="header">
                <h1>Match Day Financial Report</h1>
                <div class="subtitle">Munyonyo Soccer Team</div>
                <div class="date">Generated on ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
              ${content.innerHTML}
            </div>
          </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()

      printWindow.onload = () => {
        printWindow.print()
        printWindow.onafterprint = () => {
          printWindow.close()
          setIsExporting(false)
        }
      }
    }, 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading match day data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matchDays.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Match Days Found</p>
            <p className="text-sm text-gray-600">Create a match day first to generate reports.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-2xl font-bold">Match Day Financial Report</CardTitle>
          <CardDescription className="text-base">
            Comprehensive financial analysis for team match days
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedMatchDay} onValueChange={setSelectedMatchDay}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select match day" />
              </SelectTrigger>
              <SelectContent>
                {matchDays.map((matchDay) => (
                  <SelectItem key={matchDay.id} value={matchDay.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatDate(matchDay.match_date)}</span>
                      {matchDay.opponent && (
                        <span className="text-sm text-muted-foreground">vs {matchDay.opponent}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <p className="text-xl font-medium mb-2">Select a Match Day</p>
            <p className="text-base">Choose a match day from the dropdown to view the financial report.</p>
          </div>
        ) : (
          <div ref={printRef}>
            {/* Match Details */}
            <div className="match-details bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl mb-8 border border-blue-200">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">
                {formatDate(reportData.matchDay.match_date)}
              </h2>
              <div className="match-info flex justify-center gap-8 flex-wrap">
                {reportData.matchDay.opponent && (
                  <div className="match-info-item">
                    <div className="match-info-label">Opponent</div>
                    <div className="match-info-value">{reportData.matchDay.opponent}</div>
                  </div>
                )}
                {reportData.matchDay.venue && (
                  <div className="match-info-item">
                    <div className="match-info-label">Venue</div>
                    <div className="match-info-value">{reportData.matchDay.venue}</div>
                  </div>
                )}
                <div className="match-info-item">
                  <div className="match-info-label">Match Type</div>
                  <div className="match-info-value capitalize">{reportData.matchDay.match_type}</div>
                </div>
              </div>
            </div>



            {/* Player Contributions */}
            <div className="section mb-8">
              <h3 className="section-title mb-4">Player Contributions</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left font-semibold">Player Name</TableHead>
                      <TableHead className="text-center font-semibold">Phone Number</TableHead>
                      <TableHead className="text-right font-semibold">Amount Paid</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.playerContributions
                      .sort((a, b) => b.matchDayPayment - a.matchDayPayment)
                      .map((contribution) => (
                      <TableRow key={contribution.player.id} className="hover:bg-gray-50">
                        <TableCell className="player-name font-medium">
                          {contribution.player.name}
                        </TableCell>
                        <TableCell className="phone-number text-center font-mono">
                          {contribution.player.phone}
                        </TableCell>
                        <TableCell className={`amount text-right font-semibold ${
                          contribution.contributed ? 'paid text-green-600' : 'unpaid text-gray-400'
                        }`}>
                          UGX {formatAmount(contribution.matchDayPayment)}
                        </TableCell>
                        <TableCell className="text-center">
                          {contribution.contributed ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-300">
                              <XCircle className="w-3 h-3 mr-1" />
                              Not Paid
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="totals-row">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-center font-bold">
                        {reportData.totals.contributingPlayers}/{reportData.totals.totalPlayers}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        UGX {formatAmount(reportData.totals.totalPlayerContributions)}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {reportData.totals.contributionRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Expenses */}
            <div className="section mb-8">
              <h3 className="section-title mb-4">Match Day Expenses</h3>
              {reportData.expenses.length === 0 ? (
                <div className="no-expenses bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-lg">No expenses recorded for this match day.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left font-semibold">Description</TableHead>
                        <TableHead className="text-center font-semibold">Category</TableHead>
                        <TableHead className="text-right font-semibold">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.expenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="capitalize">
                              {expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="amount text-right font-semibold">
                            UGX {formatAmount(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="totals-row">
                        <TableCell className="font-bold">TOTAL EXPENSES</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold">
                          UGX {formatAmount(reportData.totals.totalExpenses)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Final Result */}
            <div className={`final-result rounded-xl text-center border-2 p-8 ${
              reportData.totals.netAmount >= 0 
                ? 'profit bg-green-50 border-green-200' 
                : 'loss bg-red-50 border-red-200'
            }`}>
              <h3 className={`text-2xl font-bold mb-3 flex items-center justify-center gap-3 ${
                reportData.totals.netAmount >= 0 ? 'text-green-800' : 'text-red-800'
              }`}>
                {reportData.totals.netAmount >= 0 ? (
                  <TrendingUp className="w-8 h-8" />
                ) : (
                  <TrendingDown className="w-8 h-8" />
                )}
                {reportData.totals.netAmount >= 0 ? 'Profit' : 'Loss'} of UGX {formatAmount(Math.abs(reportData.totals.netAmount))}
              </h3>
              <p className="text-gray-600 text-base">
                {reportData.totals.contributingPlayers} out of {reportData.totals.totalPlayers} players contributed 
                ({reportData.totals.contributionRate.toFixed(1)}% participation rate)
              </p>
              {reportData.totals.netAmount >= 0 ? (
                <p className="text-green-700 mt-2 text-sm">
                  Team finances are in good standing for this match day.
                </p>
              ) : (
                <p className="text-red-700 mt-2 text-sm">
                  Consider reviewing expenses or increasing player contributions.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}