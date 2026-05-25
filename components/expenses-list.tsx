"use client"

import { useState, useEffect } from "react"
import { Search, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Loader2, SearchX, Inbox } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

const API_BASE_URL = ""

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
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
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

      setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id))
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      })
    } catch (error) {
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

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesDate = dateFilter === "all" || expense.expense_date === dateFilter
    return matchesSearch && matchesCategory && matchesDate
  })

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage)

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

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || dateFilter !== "all"

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search expenses..."
            className="w-full lg:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <Select value={dateFilter} onValueChange={setDateFilter} disabled={isLoading}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="All Dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              {dates.map((date) => (
                <SelectItem key={date} value={date!}>
                  {formatDate(date!)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{filteredExpenses.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
          <p className="text-2xl font-bold text-green-600 tabular-nums">
            UGX {filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Average Expense</h3>
          <p className="text-2xl font-bold text-blue-600 tabular-nums">
            UGX {filteredExpenses.length > 0
              ? Math.round(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) / filteredExpenses.length).toLocaleString()
              : 0
            }
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {!isLoading && paginatedExpenses.length === 0 ? (
          <div className="p-16 text-center">
            {hasActiveFilters ? (
              <>
                <SearchX className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-700 text-lg font-medium mb-1">No expenses found</p>
                <p className="text-gray-500 text-sm">No expenses match your current filters. Try adjusting your search.</p>
              </>
            ) : (
              <>
                <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-700 text-lg font-medium mb-1">No expenses yet</p>
                <p className="text-gray-500 text-sm">Create your first expense to get started tracking team spending.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm">
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Expense Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date Created</TableHead>
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
                  : paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
                        <TableCell>
                          <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                          <div className="text-sm text-gray-500">{expense.category}</div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {formatDate(expense.expense_date)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          UGX {expense.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(expense.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-150"
                              title="Edit expense"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-150 disabled:opacity-50"
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
                        </TableCell>
                      </TableRow>
                    ))
                }
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
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
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the expense &quot;{expenseToDelete?.description}&quot;?
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
