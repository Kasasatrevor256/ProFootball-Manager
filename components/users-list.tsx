"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Search, Edit, Trash2, Loader2, AlertTriangle, Plus, Shield, User as UserIcon } from "lucide-react"
import Link from "next/link"

// API configuration
const API_BASE_URL = ""

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "treasurer" | "viewer"
  status: "active" | "inactive" | "suspended"
  created_at: string
  updated_at: string
}

export function UsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const { toast } = useToast()

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

  // Fetch users from API
  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("👥 Fetching users from API...")
      
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      console.log("📡 Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to fetch users: ${response.status}`)
      }

      const usersData = await response.json()
      console.log("✅ Users fetched:", (usersData.data ?? usersData).length)

      setUsers(usersData.data ?? usersData)
    } catch (error) {
      console.error("❌ Error fetching users:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load users"
      setError(errorMessage)
      
      toast({
        title: "Error loading users",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    // Get current user to prevent self-deletion
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
    
    if (currentUser.id === userId) {
      toast({
        title: "Cannot delete user",
        description: "You cannot delete your own account",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete ${userName} (${userEmail})? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(userId)
    
    try {
      console.log("🗑️ Deleting user:", userId)
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to delete user: ${response.status}`)
      }

      console.log("✅ User deleted successfully")
      
      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId))
      
      toast({
        title: "User deleted",
        description: `${userName} has been removed from the system.`,
      })
      
    } catch (error) {
      console.error("❌ Error deleting user:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user"
      
      toast({
        title: "Error deleting user",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Toggle user status
  const handleToggleStatus = async (userId: string, currentStatus: string, userName: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    
    try {
      console.log(`🔄 Changing user status from ${currentStatus} to ${newStatus}`)
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/status?status=${newStatus}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to update user status: ${response.status}`)
      }

      const updatedUser = await response.json()
      console.log("✅ User status updated successfully")
      
      // Update user in local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: updatedUser.status } : user
      ))
      
      toast({
        title: "User status updated",
        description: `${userName} is now ${newStatus}.`,
      })
      
    } catch (error) {
      console.error("❌ Error updating user status:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update user status"
      
      toast({
        title: "Error updating status",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Load users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helper function to format role display
  const formatRole = (role: string) => {
    switch (role) {
      case "admin": return "Administrator"
      case "manager": return "Manager"
      case "treasurer": return "Treasurer"
      case "viewer": return "Viewer"
      default: return role
    }
  }

  // Helper function to get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default"
      case "manager": return "secondary"
      case "treasurer": return "outline"
      case "viewer": return "outline"
      default: return "outline"
    }
  }

  // Get current user for permission checks
  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}
  const isCurrentUserAdmin = currentUser.role === "admin"

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchUsers} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Add User */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isCurrentUserAdmin && (
          <Link href="/users/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </Link>
        )}
      </div>

      {/* Users count */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          <span>
            {filteredUsers.length === users.length 
              ? `${users.length} user${users.length !== 1 ? 's' : ''} total`
              : `${filteredUsers.length} of ${users.length} users`
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>
            {users.filter(u => u.role === "admin").length} admin{users.filter(u => u.role === "admin").length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-md border">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? "No users found matching your search" : "No users found"}
            </p>
            {!searchTerm && isCurrentUserAdmin && (
              <Link href="/users/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First User
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {isCurrentUserAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {user.name}
                      {user.id === currentUser.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {formatRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => isCurrentUserAdmin ? handleToggleStatus(user.id, user.status, user.name) : undefined}
                      disabled={!isCurrentUserAdmin || user.id === currentUser.id}
                      className="p-0 h-auto"
                    >
                      <Badge 
                        variant={
                          user.status === "active" ? "default" : 
                          user.status === "inactive" ? "secondary" : "destructive"
                        }
                        className={isCurrentUserAdmin && user.id !== currentUser.id ? "cursor-pointer hover:opacity-80" : ""}
                      >
                        {user.status}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  {isCurrentUserAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/users/${user.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit {user.name}</span>
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteUser(user.id, user.name, user.email)}
                          disabled={isDeleting === user.id || user.id === currentUser.id}
                        >
                          {isDeleting === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete {user.name}</span>
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}