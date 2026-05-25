"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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

interface EditPaymentFormProps {
  paymentId: string
}

export function EditPaymentForm({ paymentId }: EditPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [payment, setPayment] = useState<Payment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    player: "",
    type: "",
    amount: "",
    date: "",
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

  // Fetch payment data and players
  const fetchData = async () => {
    setIsLoadingData(true)
    setError(null)
    
    try {
      console.log("🔍 Fetching payment and players data...")
      
      // Fetch payment details and players in parallel
      const [paymentResponse, playersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/players`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
        })
      ])

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({ detail: `HTTP ${paymentResponse.status}` }))
        throw new Error(errorData.detail || `Failed to fetch payment: ${paymentResponse.status}`)
      }

      if (!playersResponse.ok) {
        const errorData = await playersResponse.json().catch(() => ({ detail: `HTTP ${playersResponse.status}` }))
        throw new Error(errorData.detail || `Failed to fetch players: ${playersResponse.status}`)
      }

      const [paymentData, playersData] = await Promise.all([
        paymentResponse.json(),
        playersResponse.json()
      ])

      console.log("✅ Payment data fetched:", paymentData)
      console.log("✅ Players data fetched:", (playersData.data ?? playersData).length)

      setPayment(paymentData)
      setPlayers(playersData.data ?? playersData)
      
      // Populate form with existing payment data
      setFormData({
        player: paymentData.player_id,
        type: paymentData.payment_type,
        amount: paymentData.amount.toString(),
        date: paymentData.date,
      })
      
    } catch (error) {
      console.error("❌ Error fetching data:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load data"
      setError(errorMessage)
      
      toast({
        title: "Error loading data",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchData()
  }, [paymentId])

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

      // Prepare payment update data
      const updateData = {
        player_id: formData.player,
        player_name: selectedPlayer.name,
        paymentType: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
      }

      console.log("💳 Updating payment:", updateData)

      // Make API call to update payment
      const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to update payment: ${response.status}`)
      }

      const updatedPayment = await response.json()
      console.log("✅ Payment updated successfully:", updatedPayment)

      toast({
        title: "Payment updated",
        description: `Payment of UGX ${parseFloat(formData.amount).toLocaleString()} for ${selectedPlayer.name} has been updated successfully.`,
      })

      // Redirect back to payments list
      router.push("/payments")

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

  // Loading state
  if (isLoadingData) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading payment data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchData} variant="outline">
                Try Again
              </Button>
              <Link href="/payments">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Payments
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!payment) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-gray-600 mb-4">Payment not found</p>
            <Link href="/payments">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Payments
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/payments">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Payment</h1>
          <p className="text-gray-600">Update payment details for {payment.playerName}</p>
        </div>
      </div>

      {/* Current Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Payment Information</CardTitle>
          <CardDescription>This is the existing payment record you're editing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Player</p>
              <p className="font-medium">{payment.playerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="font-medium">{formatPaymentType(payment.paymentType)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="font-medium text-green-600">UGX {payment.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium">{new Date(payment.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Payment Details</CardTitle>
          <CardDescription>Modify the payment information below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player Selection */}
              <div className="space-y-2">
                <Label htmlFor="player">Player *</Label>
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
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Payment...
                  </>
                ) : (
                  "Update Payment"
                )}
              </Button>
              <Link href="/payments">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default EditPaymentForm