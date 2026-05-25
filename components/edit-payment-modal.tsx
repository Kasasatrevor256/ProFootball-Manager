"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle } from "lucide-react"

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

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: Payment
  onPaymentUpdated: (updatedPayment: Payment) => void
}

export function EditPaymentModal({ isOpen, onClose, payment, onPaymentUpdated }: EditPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    player: payment.playerId,
    type: payment.paymentType,
    amount: payment.amount.toString(),
    date: payment.date,
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

  // Fetch players when modal opens
  const fetchPlayers = async () => {
    setIsLoadingPlayers(true)
    setError(null)
    
    try {
      console.log("🏃 Fetching players for payment edit...")
      
      const response = await fetch(`${API_BASE_URL}/api/players`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to fetch players: ${response.status}`)
      }

      const playersData = await response.json()
      console.log("✅ Players fetched for payment edit:", (playersData.data ?? playersData).length)

      setPlayers(playersData.data ?? playersData)
    } catch (error) {
      console.error("❌ Error fetching players:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load players"
      setError(errorMessage)
      
      toast({
        title: "Error loading players",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingPlayers(false)
    }
  }

  // Load players when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPlayers()
      // Reset form data when modal opens with new payment
      setFormData({
        player: payment.playerId,
        type: payment.paymentType,
        amount: payment.amount.toString(),
        date: payment.date,
      })
    }
  }, [isOpen, payment])

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      
      // Auto-populate amount based on payment type and selected player
      if (name === "type" || name === "player") {
        const selectedPlayer = players.find(p => p.id === (name === "player" ? value : prev.player))
        const paymentType = name === "type" ? value : prev.type
        
        if (selectedPlayer && paymentType) {
          let defaultAmount = ""
          switch (paymentType) {
            case "annual":
              defaultAmount = selectedPlayer.annual.toString()
              break
            case "monthly":
              defaultAmount = selectedPlayer.monthly.toString()
              break
            case "pitch":
              defaultAmount = selectedPlayer.pitch.toString()
              break
            case "matchday":
              defaultAmount = selectedPlayer.match_day?.toString() || "5000"
              break
          }
          newData.amount = defaultAmount
        }
      }
      
      return newData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.player) {
      toast({
        title: "Validation Error",
        description: "Please select a player",
        variant: "destructive",
      })
      return
    }

    if (!formData.type) {
      toast({
        title: "Validation Error",
        description: "Please select a payment type",
        variant: "destructive",
      })
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (!formData.date) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const selectedPlayer = players.find(p => p.id === formData.player)
      if (!selectedPlayer) {
        throw new Error("Selected player not found")
      }

      // Prepare payment update data - only include changed fields
      const updateData: any = {}
      
      // Only include player_id if it changed
      if (formData.player !== payment.playerId) {
        updateData.player_id = formData.player
      }
      
      // Only include payment_type if it changed
      if (formData.type !== payment.paymentType) {
        updateData.payment_type = formData.type
      }
      
      // Only include amount if it changed
      const newAmount = parseFloat(formData.amount)
      if (newAmount !== payment.amount) {
        updateData.amount = newAmount
      }
      
      // Only include date if it changed
      if (formData.date !== payment.date) {
        updateData.date = formData.date
      }
      
      // Always include player_name if player changed
      if (formData.player !== payment.playerId) {
        updateData.player_name = selectedPlayer.name
      }

      console.log("💳 Updating payment with data:", updateData)

      // Make API call to update payment
      const response = await fetch(`${API_BASE_URL}/api/payments/${payment.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        let errorMessage = `Failed to update payment: ${response.status}`
        
        try {
          const errorData = await response.json()
          console.log("❌ Error response data:", errorData)
          
          // Handle different error response formats
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (typeof errorData.detail === 'object') {
            // Handle validation errors or complex error objects
            errorMessage = JSON.stringify(errorData.detail)
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else if (Array.isArray(errorData)) {
            // Handle array of errors
            errorMessage = errorData.map(err => err.msg || err.message || err).join(', ')
          }
        } catch (parseError) {
          console.log("❌ Could not parse error response, using default message")
        }
        
        throw new Error(errorMessage)
      }

      const updatedPayment = await response.json()
      console.log("✅ Payment updated successfully:", updatedPayment)

      toast({
        title: "Payment updated",
        description: `Payment of UGX ${parseFloat(formData.amount).toLocaleString()} for ${selectedPlayer.name} has been updated successfully.`,
      })

      // Call the callback to update the payments list
      onPaymentUpdated(updatedPayment)
      
      // Close the modal
      onClose()

    } catch (error) {
      console.error("❌ Error updating payment:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update payment"
      
      toast({
        title: "Error updating payment",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to format payment type for display
  const formatPaymentType = (type: string) => {
    switch (type) {
      case "annual": return "Annual Subscription"
      case "monthly": return "Monthly Subscription"
      case "pitch": return "Pitch Payment"
      case "matchday": return "Match Day Payment"
      default: return type
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Update payment details for {payment.playerName}
          </DialogDescription>
        </DialogHeader>

        {/* Current Payment Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium mb-3">Current Payment</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium">{formatPaymentType(payment.paymentType)}</span>
            </div>
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-medium text-green-600">UGX {payment.amount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium">{new Date(payment.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Player Selection */}
            <div className="space-y-2">
              <Label htmlFor="player">Player *</Label>
              {isLoadingPlayers ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select value={formData.player} onValueChange={(value) => handleChange("player", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Payment Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Subscription</SelectItem>
                  <SelectItem value="monthly">Monthly Subscription</SelectItem>
                  <SelectItem value="pitch">Pitch Payment</SelectItem>
                  <SelectItem value="matchday">Match Day Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                min="0"
                step="1000"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || isLoadingPlayers}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Payment"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditPaymentModal