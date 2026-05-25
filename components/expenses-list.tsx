"use client"

import { useState, useEffect } from "react"
import { Search, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"

// API configuration
const API_BASE_URL = ""

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string // Changed from match_day_date to expense_date
  created_at: string
  updated_at: string
}

export function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("") // Changed from matchDayFilter to dateFilter
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  // Load expenses from API
  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/expenses?limit=100`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to load expenses")
      }

      const data = await response.json()
      setExpenses(data.data ?? data)
    } catch (error) {
      console.error("Error loading expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (expense: Expense) => {
    setExpenseToDelete(expense)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!expenseToDelete) return

    try {
      setIsDeleting(expenseToDelete.id)
      
      const response = await fetch(`${API_BASE_URL}/api/expenses/${expenseToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete expense")
      }

      // Remove expense from local state
      setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id))
      
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      })

    } catch (error) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    }
  }

  // Filter expenses based on search and filters
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesDate = dateFilter === "" || expense.expense_date === dateFilter
    
    return matchesSearch && matchesCategory && matchesDate
  })

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage)

  // Get unique categories and dates for filters
  const categories = Array.from(new Set(expenses.map((expense) => expense.category)))
  const dates = Array.from(new Set(expenses.map((expense) => expense.expense_date)))
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading expenses...</span>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search expenses..."
            className="w-full lg:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full lg:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full lg:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Dates</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date!)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
          <p className="text-2xl font-bold text-green-600">
            UGX {filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Average Expense</h3>
          <p className="text-2xl font-bold text-blue-600">
            UGX {filteredExpenses.length > 0 
              ? Math.round(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) / filteredExpenses.length).toLocaleString()
              : 0
            }
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {expenses.length === 0 
                ? "No expenses recorded yet. Create your first expense to get started."
                : "No expenses match your current filters."
              }
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expense Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                      <div className="text-sm text-gray-500">{expense.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDate(expense.expense_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      UGX {expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(expense.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          onClick={() => handleDelete(expense)}
                          disabled={isDeleting === expense.id}
                          title="Delete expense"
                        >
                          {isDeleting === expense.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
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
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the expense "{expenseToDelete?.description}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}