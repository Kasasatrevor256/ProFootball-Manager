"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Search, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Loader2, Plus, AlertTriangle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { EditPaymentModal } from "@/components/edit-payment-modal"
import { getCachedData, setCachedData, invalidateCacheOnMutation } from "@/lib/api-cache"

// API configuration
const API_BASE_URL = ""

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
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  
  const { toast } = useToast()
  
  const itemsPerPage = 10

  // Helper function to get auth headers
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

  // Fetch payments from API with caching - fetches all payments
  const fetchPayments = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const cacheKey = `payments-all`

      // Check cache first
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setPayments(cachedData)
        setIsLoading(false)
        return
      }

      // Fetch all payments in batches
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
        allPayments.push(...paymentsData)
        
        hasMore = paymentsData.length === limit
        skip += limit
      }

      setCachedData(cacheKey, allPayments)
      setPayments(allPayments)
    } catch (error) {
      console.error("❌ Error fetching payments:", error)
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

  // Handle edit payment
  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    setEditModalOpen(true)
  }

  // Handle payment updated
  const handlePaymentUpdated = (updatedPayment: Payment) => {
    setPayments(payments.map(payment => 
      payment.id === updatedPayment.id ? updatedPayment : payment
    ))
  }

  // Delete payment
  const handleDeletePayment = async (paymentId: string, playerName: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete the payment of UGX ${amount.toLocaleString()} for ${playerName}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(paymentId)
    
    try {
      console.log("🗑️ Deleting payment:", paymentId)
      
      const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to delete payment: ${response.status}`)
      }

      console.log("✅ Payment deleted successfully")

      // Invalidate cache
      invalidateCacheOnMutation('payment')

      // Remove payment from local state
      setPayments(payments.filter(payment => payment.id !== paymentId))

      toast({
        title: "Payment deleted",
        description: `Payment of UGX ${amount.toLocaleString()} for ${playerName} has been removed.`,
      })
      
    } catch (error) {
      console.error("❌ Error deleting payment:", error)
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

  // Load payments on component mount
  useEffect(() => {
    fetchPayments()
  }, [])

  // Filter payments based on search term and type
  const filteredPayments = payments.filter(
    (payment) =>
      payment.playerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (typeFilter === "all" || payment.paymentType === typeFilter),
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter])

  // Helper function to format payment type
  const formatPaymentType = (type: string) => {
    switch (type) {
      case "annual": return "Annual Subscription"
      case "monthly": return "Monthly Subscription"
      case "pitch": return "Pitch Payment"
      case "matchday": return "Match Day Payment"
      default: return type
    }
  }

  // Calculate total amounts for summary
  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading payments...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchPayments} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search payments..."
            className="w-full lg:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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

        {/* Add Payment Button */}
        <div className="ml-auto">
          <Link href="/payments/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Total Payments</div>
          <div className="text-2xl font-bold text-gray-900">{filteredPayments.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">UGX {totalAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">Average Payment</div>
          <div className="text-2xl font-bold text-blue-600">
            UGX {filteredPayments.length > 0 ? Math.round(totalAmount / filteredPayments.length).toLocaleString() : "0"}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {paginatedPayments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm || typeFilter !== "all" ? "No payments found matching your criteria" : "No payments recorded yet"}
            </p>
            {!searchTerm && typeFilter === "all" && (
              <Link href="/payments/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Record First Payment
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.playerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      payment.paymentType === "annual" ? "bg-purple-100 text-purple-800" :
                      payment.paymentType === "monthly" ? "bg-blue-100 text-blue-800" :
                      payment.paymentType === "pitch" ? "bg-green-100 text-green-800" :
                      "bg-orange-100 text-orange-800"
                    }`}>
                      {formatPaymentType(payment.paymentType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    UGX {payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEditPayment(payment)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit payment</span>
                      </button>
                      <button 
                        onClick={() => handleDeletePayment(payment.id, payment.playerName, payment.amount)}
                        disabled={isDeleting === payment.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        {isDeleting === payment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Delete payment</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
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