"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Search, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Loader2, Plus, AlertTriangle, SearchX, Inbox } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { EditPaymentModal } from "@/components/edit-payment-modal"
import { getCachedData, setCachedData, invalidateCacheOnMutation } from "@/lib/api-cache"

const API_BASE_URL = ""

const PAYMENT_TYPE_STYLES: Record<string, string> = {
  annual:   'bg-blue-100 text-blue-800 border-blue-200',
  monthly:  'bg-purple-100 text-purple-800 border-purple-200',
  pitch:    'bg-green-100 text-green-800 border-green-200',
  matchday: 'bg-orange-100 text-orange-800 border-orange-200',
}

interface Payment {
  id: string
  playerId: string
  playerName: string
  paymentType: "annual" | "monthly" | "pitch" | "matchday"
  amount: number
  date: string
  created_by?: string
  createdAt: string
  updatedAt: string
}

export function PaymentsList() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const { toast } = useToast()

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleSearch = useCallback((value: string) => {
    if (searchTimeout.current !== undefined) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearchTerm(value), 300)
  }, [])

  const itemsPerPage = 10

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {}
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token")
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
    }
    return headers
  }

  const fetchPayments = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const cacheKey = `payments-all`
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setPayments(cachedData)
        setIsLoading(false)
        return
      }

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
          const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
          throw new Error(errorData.detail || `Failed to fetch payments: ${response.status}`)
        }

        const paymentsData = await response.json()
        const page = paymentsData.data ?? paymentsData
        allPayments.push(...page)

        hasMore = allPayments.length < (paymentsData.total ?? Infinity) && page.length === limit
        skip += limit
      }

      setCachedData(cacheKey, allPayments)
      setPayments(allPayments)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load payments"
      setError(errorMessage)
      toast({
        title: "Error loading payments",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    setEditModalOpen(true)
  }

  const handlePaymentUpdated = (updatedPayment: Payment) => {
    setPayments(payments.map(payment =>
      payment.id === updatedPayment.id ? updatedPayment : payment
    ))
  }

  const handleDeletePayment = async (paymentId: string, playerName: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete the payment of UGX ${amount.toLocaleString()} for ${playerName}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(paymentId)
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to delete payment: ${response.status}`)
      }

      invalidateCacheOnMutation('payment')
      setPayments(payments.filter(payment => payment.id !== paymentId))
      toast({
        title: "Payment deleted",
        description: `Payment of UGX ${amount.toLocaleString()} for ${playerName} has been removed.`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete payment"
      toast({
        title: "Error deleting payment",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filteredPayments = payments.filter(
    (payment) =>
      payment.playerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (typeFilter === "all" || payment.paymentType === typeFilter),
  )

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter])

  const formatPaymentType = (type: string) => {
    switch (type) {
      case "annual": return "Annual"
      case "monthly": return "Monthly"
      case "pitch": return "Pitch"
      case "matchday": return "Match Day"
      default: return type
    }
  }

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)

  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchPayments} variant="outline">Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search payments..."
            className="w-full lg:w-64"
            defaultValue={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Select value={typeFilter} onValueChange={setTypeFilter} disabled={isLoading}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Payment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="annual">Annual Subscription</SelectItem>
              <SelectItem value="monthly">Monthly Subscription</SelectItem>
              <SelectItem value="pitch">Pitch Payment</SelectItem>
              <SelectItem value="matchday">Match Day Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Link href="/payments/new">
            <Button className="transition-all duration-150">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Total Payments</div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{filteredPayments.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-green-600 tabular-nums">UGX {totalAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Average Payment</div>
          <div className="text-2xl font-bold text-blue-600 tabular-nums">
            UGX {filteredPayments.length > 0 ? Math.round(totalAmount / filteredPayments.length).toLocaleString() : "0"}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {!isLoading && paginatedPayments.length === 0 ? (
          <div className="text-center py-16">
            {searchTerm || typeFilter !== "all" ? (
              <>
                <SearchX className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-700 text-lg font-medium mb-1">No payments found</p>
                <p className="text-gray-500 text-sm">No payments match your current filters. Try adjusting your search.</p>
              </>
            ) : (
              <>
                <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-700 text-lg font-medium mb-1">No payments yet</p>
                <p className="text-gray-500 text-sm mb-4">Start recording payments to track team finances.</p>
                <Link href="/payments/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Record First Payment
                  </Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm">
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : paginatedPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
                      <TableCell className="font-medium">{payment.playerName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PAYMENT_TYPE_STYLES[payment.paymentType] || 'bg-gray-100 text-gray-800 border-gray-200'}
                        >
                          {formatPaymentType(payment.paymentType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        UGX {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-150"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit payment</span>
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id, payment.playerName, payment.amount)}
                            disabled={isDeleting === payment.id}
                            className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-150 disabled:opacity-50"
                          >
                            {isDeleting === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Delete payment</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all duration-150"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="text-sm text-gray-700">Page {currentPage} of {totalPages}</div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all duration-150"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {editingPayment && (
        <EditPaymentModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingPayment(null)
          }}
          payment={editingPayment}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}
    </div>
  )
}

export default PaymentsList
