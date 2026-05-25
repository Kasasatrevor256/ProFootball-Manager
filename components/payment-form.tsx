"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle, Check, X, Trash2, AlertCircle, RefreshCw, Users, DollarSign, Search } from "lucide-react"
import { useRouter } from "next/navigation"

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

interface PlayerPaymentEntry {
  player_id: string
  player_name: string
  annual_amount: string
  monthly_amount: string
  pitch_amount: string
  annual_status: 'pending' | 'success' | 'error'
  monthly_status: 'pending' | 'success' | 'error'
  pitch_status: 'pending' | 'success' | 'error'
  annual_error?: string
  monthly_error?: string
  pitch_error?: string
}

interface PaymentData {
  playerId: string
  playerName: string
  paymentType: "annual" | "monthly" | "pitch"
  amount: number
  date: string
}

export function PaymentForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [paymentEntries, setPaymentEntries] = useState<PlayerPaymentEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [currentPlayerSelection, setCurrentPlayerSelection] = useState("")
  
  // New states for searchable dropdown
  const [playerSearchTerm, setPlayerSearchTerm] = useState("")
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false)
  
  const [processingResults, setProcessingResults] = useState<{
    total: number
    success: number
    failed: number
    completed: boolean
  }>({ total: 0, success: 0, failed: 0, completed: false })
  const { toast } = useToast()
  const router = useRouter()

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

  const extractErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, any>
      if (typeof errorObj.detail === 'string') {
        return errorObj.detail
      }
      if (typeof errorObj.message === 'string') {
        return errorObj.message
      }
    }
    
    return "An unexpected error occurred"
  }

  // Fetch players from API
  const fetchPlayers = async () => {
    setIsLoadingPlayers(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/players`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        let errorMessage = "Failed to load players"
        
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorMessage = errorData.detail
          } else if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch (jsonError) {
          // Response is not JSON
        }
        
        if (response.status === 401) {
          errorMessage = "Your session has expired. Please log in again."
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to view players."
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later."
        }
        
        throw new Error(errorMessage)
      }

      const playersData = await response.json()
      setPlayers(playersData.data ?? playersData)
      
    } catch (error) {
      const errorMessage = extractErrorMessage(error)
      setError(errorMessage)
    } finally {
      setIsLoadingPlayers(false)
    }
  }

  // Load players on component mount
  useEffect(() => {
    fetchPlayers()
  }, [])

  const addPlayer = (playerId: string) => {
    if (!playerId) return

    // Check if player is already added
    if (selectedPlayerIds.includes(playerId)) {
      toast({
        title: "Player Already Added",
        description: "This player is already in the payment list",
        variant: "destructive",
      })
      setCurrentPlayerSelection("")
      setPlayerSearchTerm("")
      setIsPlayerDropdownOpen(false)
      return
    }

    const player = players.find(p => p.id === playerId)
    if (!player) return

    // Add player to selected list
    setSelectedPlayerIds(prev => [...prev, playerId])

    // Create payment entry with empty amounts (user chooses what to pay)
    const newEntry: PlayerPaymentEntry = {
      player_id: player.id,
      player_name: player.name,
      annual_amount: "",
      monthly_amount: "",
      pitch_amount: "",
      annual_status: 'pending',
      monthly_status: 'pending',
      pitch_status: 'pending'
    }

    setPaymentEntries(prev => [...prev, newEntry])
    setCurrentPlayerSelection("")
    setPlayerSearchTerm("")
    setIsPlayerDropdownOpen(false)
  }

  const removePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev => prev.filter(id => id !== playerId))
    setPaymentEntries(prev => prev.filter(entry => entry.player_id !== playerId))
  }

  const handleAmountChange = (playerId: string, field: keyof PlayerPaymentEntry, value: string) => {
    setPaymentEntries(prev => prev.map(entry => 
      entry.player_id === playerId 
        ? { ...entry, [field]: value, [`${field.split('_')[0]}_status`]: 'pending' }
        : entry
    ))
  }

  const fillAllDefaults = () => {
    setPaymentEntries(prev => prev.map(entry => {
      const player = players.find(p => p.id === entry.player_id)
      if (player) {
        return {
          ...entry,
          annual_amount: player.annual.toString(),
          monthly_amount: player.monthly.toString(),
          pitch_amount: player.pitch.toString(),
          annual_status: 'pending',
          monthly_status: 'pending',
          pitch_status: 'pending'
        }
      }
      return entry
    }))
  }

  const clearAllAmounts = () => {
    setPaymentEntries(prev => prev.map(entry => ({
      ...entry,
      annual_amount: "",
      monthly_amount: "",
      pitch_amount: "",
      annual_status: 'pending',
      monthly_status: 'pending',
      pitch_status: 'pending'
    })))
  }

  // Filter available players based on search term
  const availablePlayers = players.filter(player => 
    !selectedPlayerIds.includes(player.id) &&
    (player.name.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
     player.phone.toLowerCase().includes(playerSearchTerm.toLowerCase()))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (paymentEntries.length === 0) {
      toast({
        title: "No Players Selected",
        description: "Please add at least one player",
        variant: "destructive",
      })
      return
    }

    // Collect all payments to process
    const paymentsToProcess: Array<{
      entry: PlayerPaymentEntry
      type: "annual" | "monthly" | "pitch"
      amount: number
    }> = []

    paymentEntries.forEach(entry => {
      if (entry.annual_amount && parseFloat(entry.annual_amount) > 0) {
        paymentsToProcess.push({
          entry,
          type: "annual",
          amount: parseFloat(entry.annual_amount)
        })
      }
      if (entry.monthly_amount && parseFloat(entry.monthly_amount) > 0) {
        paymentsToProcess.push({
          entry,
          type: "monthly",
          amount: parseFloat(entry.monthly_amount)
        })
      }
      if (entry.pitch_amount && parseFloat(entry.pitch_amount) > 0) {
        paymentsToProcess.push({
          entry,
          type: "pitch",
          amount: parseFloat(entry.pitch_amount)
        })
      }
    })

    if (paymentsToProcess.length === 0) {
      toast({
        title: "No Payments to Process",
        description: "Please enter amounts for at least one payment type",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Initialize processing results
    setProcessingResults({
      total: paymentsToProcess.length,
      success: 0,
      failed: 0,
      completed: false
    })

    // Reset all statuses
    setPaymentEntries(prev => prev.map(entry => ({
      ...entry,
      annual_status: 'pending',
      monthly_status: 'pending',
      pitch_status: 'pending',
      annual_error: undefined,
      monthly_error: undefined,
      pitch_error: undefined
    })))

    let successCount = 0
    let errorCount = 0

    // Process each payment
    for (const payment of paymentsToProcess) {
      try {
        const paymentData: PaymentData = {
          playerId: payment.entry.player_id,
          playerName: payment.entry.player_name,
          paymentType: payment.type,
          amount: payment.amount,
          date: paymentDate,
        }

        const response = await fetch(`${API_BASE_URL}/api/payments`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(paymentData),
        })

        if (!response.ok) {
          let errorMessage = "Failed to record payment"
          
          try {
            const errorData = await response.json()
            if (errorData.detail) {
              errorMessage = errorData.detail
            } else if (errorData.message) {
              errorMessage = errorData.message
            }
          } catch (jsonError) {
            // Response is not JSON
          }
          
          if (response.status === 401) {
            errorMessage = "Session expired. Please log in again."
          } else if (response.status === 403) {
            errorMessage = "Permission denied"
          } else if (response.status === 422) {
            errorMessage = "Invalid payment data"
          } else if (response.status >= 500) {
            errorMessage = "Server error"
          }
          
          throw new Error(errorMessage)
        }

        // Update status to success
        setPaymentEntries(prev => prev.map(entry => 
          entry.player_id === payment.entry.player_id
            ? { ...entry, [`${payment.type}_status`]: 'success' }
            : entry
        ))
        
        successCount++
        
        // Update progress
        setProcessingResults(prev => ({
          ...prev,
          success: successCount
        }))
        
      } catch (error) {
        const errorMessage = extractErrorMessage(error)
        
        // Update status to error
        setPaymentEntries(prev => prev.map(entry => 
          entry.player_id === payment.entry.player_id
            ? { 
                ...entry, 
                [`${payment.type}_status`]: 'error',
                [`${payment.type}_error`]: errorMessage
              }
            : entry
        ))
        
        errorCount++
        
        // Update progress
        setProcessingResults(prev => ({
          ...prev,
          failed: errorCount
        }))
      }
    }

    setIsLoading(false)
    setProcessingResults(prev => ({ ...prev, completed: true }))

    // Show summary toast
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "All Payments Recorded",
        description: `Successfully recorded ${successCount} payments.`,
      })
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Partial Success",
        description: `${successCount} payments recorded successfully, ${errorCount} failed.`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "All Payments Failed",
        description: `Failed to record ${errorCount} payments.`,
        variant: "destructive",
      })
    }
  }

  // Loading state
  if (isLoadingPlayers) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading players...</p>
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
            <Button onClick={fetchPlayers} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPayments = paymentEntries.reduce((sum, entry) => {
    let count = 0
    if (entry.annual_amount && parseFloat(entry.annual_amount) > 0) count++
    if (entry.monthly_amount && parseFloat(entry.monthly_amount) > 0) count++
    if (entry.pitch_amount && parseFloat(entry.pitch_amount) > 0) count++
    return sum + count
  }, 0)

  const hasErrors = paymentEntries.some(entry => 
    entry.annual_status === 'error' || 
    entry.monthly_status === 'error' || 
    entry.pitch_status === 'error'
  )

  const hasSuccesses = paymentEntries.some(entry => 
    entry.annual_status === 'success' || 
    entry.monthly_status === 'success' || 
    entry.pitch_status === 'success'
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>Select players and enter payment amounts for each payment type</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {/* Processing Results */}
          {processingResults.completed && (
            <Alert className={hasErrors ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
              <AlertCircle className={`h-4 w-4 ${hasErrors ? "text-orange-600" : "text-green-600"}`} />
              <AlertDescription>
                <div className="font-semibold mb-2">
                  Payment Processing Complete
                </div>
                <div className="text-sm space-y-1">
                  <p>• Total payments: {processingResults.total}</p>
                  <p className="text-green-600">• Successful: {processingResults.success}</p>
                  {processingResults.failed > 0 && (
                    <p className="text-red-600">• Failed: {processingResults.failed}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Player Selection and Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="player">Add Player</Label>
              {/* Custom Searchable Dropdown */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players..."
                    value={playerSearchTerm}
                    onChange={(e) => {
                      setPlayerSearchTerm(e.target.value)
                      setIsPlayerDropdownOpen(true)
                    }}
                    onFocus={() => setIsPlayerDropdownOpen(true)}
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
                
                {/* Dropdown Results */}
                {isPlayerDropdownOpen && playerSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {availablePlayers.length > 0 ? (
                      availablePlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => addPlayer(player.id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b last:border-b-0"
                          disabled={isLoading}
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-500">{player.phone}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500 text-sm">
                        No players found matching "{playerSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
                
                {/* Click overlay to close dropdown */}
                {isPlayerDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-5" 
                    onClick={() => setIsPlayerDropdownOpen(false)}
                  />
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                {players.filter(p => !selectedPlayerIds.includes(p.id)).length} players available
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Payment Date</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={fillAllDefaults}
                  disabled={isLoading || paymentEntries.length === 0}
                >
                  Fill Defaults
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={clearAllAmounts}
                  disabled={isLoading || paymentEntries.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          {/* Payment Entries */}
          {paymentEntries.length > 0 && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Payment Amounts</h3>
                
                {paymentEntries.map((entry) => {
                  const player = players.find(p => p.id === entry.player_id)
                  const entryHasError = entry.annual_status === 'error' || 
                                       entry.monthly_status === 'error' || 
                                       entry.pitch_status === 'error'
                  
                  return (
                    <div key={entry.player_id} className={`border rounded-lg p-4 mb-4 ${
                      entryHasError ? 'border-red-200 bg-red-50' : ''
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                          {entry.player_name}
                          {entryHasError && <AlertCircle className="h-4 w-4 text-red-600" />}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePlayer(entry.player_id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Annual Payment */}
                        <div className="space-y-2">
                          <Label>Annual Payment (UGX)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="Enter amount"
                              value={entry.annual_amount}
                              onChange={(e) => handleAmountChange(entry.player_id, 'annual_amount', e.target.value)}
                              disabled={isLoading}
                              className={entry.annual_status === 'error' ? 'border-red-300' : ''}
                            />
                            {entry.annual_status === 'success' && <Check className="h-4 w-4 text-green-600" />}
                            {entry.annual_status === 'error' && <X className="h-4 w-4 text-red-600" />}
                            {isLoading && entry.annual_amount && parseFloat(entry.annual_amount) > 0 && 
                             entry.annual_status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                          </div>
                          <p className="text-xs text-gray-500">Default: UGX {player?.annual.toLocaleString()}</p>
                          {entry.annual_error && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {entry.annual_error}
                            </p>
                          )}
                        </div>

                        {/* Monthly Payment */}
                        <div className="space-y-2">
                          <Label>Monthly Payment (UGX)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="Enter amount"
                              value={entry.monthly_amount}
                              onChange={(e) => handleAmountChange(entry.player_id, 'monthly_amount', e.target.value)}
                              disabled={isLoading}
                              className={entry.monthly_status === 'error' ? 'border-red-300' : ''}
                            />
                            {entry.monthly_status === 'success' && <Check className="h-4 w-4 text-green-600" />}
                            {entry.monthly_status === 'error' && <X className="h-4 w-4 text-red-600" />}
                            {isLoading && entry.monthly_amount && parseFloat(entry.monthly_amount) > 0 && 
                             entry.monthly_status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                          </div>
                          <p className="text-xs text-gray-500">Default: UGX {player?.monthly.toLocaleString()}</p>
                          {entry.monthly_error && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {entry.monthly_error}
                            </p>
                          )}
                        </div>

                        {/* Pitch Payment */}
                        <div className="space-y-2">
                          <Label>Pitch Payment (UGX)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="Enter amount"
                              value={entry.pitch_amount}
                              onChange={(e) => handleAmountChange(entry.player_id, 'pitch_amount', e.target.value)}
                              disabled={isLoading}
                              className={entry.pitch_status === 'error' ? 'border-red-300' : ''}
                            />
                            {entry.pitch_status === 'success' && <Check className="h-4 w-4 text-green-600" />}
                            {entry.pitch_status === 'error' && <X className="h-4 w-4 text-red-600" />}
                            {isLoading && entry.pitch_amount && parseFloat(entry.pitch_amount) > 0 && 
                             entry.pitch_status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                          </div>
                          <p className="text-xs text-gray-500">Default: UGX {player?.pitch.toLocaleString()}</p>
                          {entry.pitch_error && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {entry.pitch_error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span><strong>Players:</strong> {paymentEntries.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span><strong>Payments:</strong> {totalPayments}</span>
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button 
              type="submit"
              disabled={isLoading || paymentEntries.length === 0}
              className="min-w-32"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Recording..." : totalPayments > 0 ? `Record ${totalPayments} Payments` : "Record Payments"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/payments")}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>

          {/* Empty State */}
          {paymentEntries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No players selected</p>
              <p className="text-sm">Search for players above to start recording payments</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default PaymentForm