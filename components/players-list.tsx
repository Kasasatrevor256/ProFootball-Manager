"use client"
import { getCachedData, setCachedData, invalidateCacheOnMutation } from "@/lib/api-cache"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Search, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, Plus, AlertTriangle, Download } from "lucide-react"
import Link from "next/link"
import EditPlayerModal from "./EditPlayerModal" // Import the modal component

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
  created_at: string
  updated_at: string
}

export function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
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

  // Fetch players from API
  const fetchPlayers = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("🏃 Fetching players from API...")
      
      const response = await fetch(`${API_BASE_URL}/api/players`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      console.log("📡 Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to fetch players: ${response.status}`)
      }

      const playersData = await response.json()
      console.log("✅ Players fetched:", (playersData.data ?? playersData).length)

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
      setIsLoading(false)
    }
  }

  // Handle edit player - open modal
  const handleEditPlayer = (player: Player) => {
    setSelectedPlayer(player)
    setIsEditModalOpen(true)
  }

  // Handle player updated from modal
  const handlePlayerUpdated = (updatedPlayer: Player) => {
    setPlayers(players.map(player => 
      player.id === updatedPlayer.id ? updatedPlayer : player
    ))
  }

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedPlayer(null)
  }

  // Delete player
  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to delete ${playerName}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(playerId)
    
    try {
      console.log("🗑️ Deleting player:", playerId)
      
      const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
        throw new Error(errorData.detail || `Failed to delete player: ${response.status}`)
      }

      console.log("✅ Player deleted successfully")
      
      // Remove player from local state
      setPlayers(players.filter(player => player.id !== playerId))
      
      toast({
        title: "Player deleted",
        description: `${playerName} has been removed from the team.`,
      })
      
    } catch (error) {
      console.error("❌ Error deleting player:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete player"
      
      toast({
        title: "Error deleting player",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Export players to PDF with same styling as Monthly Report
  const handleExportPDF = async () => {
    if (filteredPlayers.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no players to export to PDF.",
        variant: "destructive",
      })
      return
    }

    setIsExportingPDF(true)
    
    try {
      // Calculate totals
      const totalAnnual = filteredPlayers.reduce((sum, player) => sum + player.annual, 0)
      const totalMonthly = filteredPlayers.reduce((sum, player) => sum + player.monthly, 0)
      const totalPitch = filteredPlayers.reduce((sum, player) => sum + player.pitch, 0)

      // Create HTML content with same styling as Monthly Report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Players List Report</title>
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
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            .amount {
              text-align: right;
              font-family: monospace;
            }
            .player-name {
              font-weight: 600;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Players List Report ⚽</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Munyonyo Soccer Team - Player Registry</p>
          </div>

          <div class="summary">
            <h3>Summary Statistics</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <strong>Total Players:</strong><br>
                ${filteredPlayers.length}
              </div>
              <div class="summary-item">
                <strong>Total Annual Fees:</strong><br>
                UGX ${totalAnnual.toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Total Monthly Fees:</strong><br>
                UGX ${totalMonthly.toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Total Pitch Fees:</strong><br>
                UGX ${totalPitch.toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Average Annual:</strong><br>
                UGX ${Math.round(totalAnnual / filteredPlayers.length).toLocaleString()}
              </div>
              <div class="summary-item">
                <strong>Average Monthly:</strong><br>
                UGX ${Math.round(totalMonthly / filteredPlayers.length).toLocaleString()}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Phone Number</th>
                <th class="amount">Annual Fee</th>
                <th class="amount">Monthly Fee</th>
                <th class="amount">Pitch Fee</th>
                <th>Registration Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPlayers.map(player => `
                <tr>
                  <td class="player-name">${player.name}</td>
                  <td>${player.phone}</td>
                  <td class="amount">UGX ${player.annual.toLocaleString()}</td>
                  <td class="amount">UGX ${player.monthly.toLocaleString()}</td>
                  <td class="amount">UGX ${player.pitch.toLocaleString()}</td>
                  <td>${new Date(player.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td><strong>TOTALS</strong></td>
                <td><strong>${filteredPlayers.length} Players</strong></td>
                <td class="amount"><strong>UGX ${totalAnnual.toLocaleString()}</strong></td>
                <td class="amount"><strong>UGX ${totalMonthly.toLocaleString()}</strong></td>
                <td class="amount"><strong>UGX ${totalPitch.toLocaleString()}</strong></td>
                <td>-</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated automatically by the Munyonyo Soccer Team Management System</p>
            <p>Player registry as of ${new Date().toLocaleDateString()}</p>
            <p><strong>Note:</strong> Fees shown are standard rates per player</p>
          </div>
        </body>
        </html>
      `

      // Open print window
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.open()
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        printWindow.onload = () => {
          printWindow.print()
          printWindow.onafterprint = () => {
            printWindow.close()
          }
        }

        toast({
          title: "Export successful",
          description: "Players list has been prepared for printing/PDF export",
        })
      } else {
        toast({
          title: "Export failed",
          description: "Please allow pop-ups to export the report",
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error("❌ Error exporting PDF:", error)
      toast({
        title: "Export failed",
        description: "Failed to export players list",
        variant: "destructive",
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Load players on component mount
  useEffect(() => {
    fetchPlayers()
  }, [])

  // Filter players based on search term
  const filteredPlayers = players.filter((player) => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading players...</p>
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
            <Button onClick={fetchPlayers} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">    
      {/* Header with Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="text-sm text-gray-600">
          {filteredPlayers.length === players.length 
            ? `${players.length} player${players.length !== 1 ? 's' : ''} total`
            : `${filteredPlayers.length} of ${players.length} players`
          }
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              disabled={isLoading}
            />
          </div>
          
          {/* Export Button */}
          {filteredPlayers.length > 0 && (
            <Button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              variant="outline"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {paginatedPlayers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? "No players found matching your search" : "No players found"}
            </p>
            {!searchTerm && (
              <Link href="/players/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Player
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Annual Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pitch Payment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link 
                        href={`/players/${player.id}`} 
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      UGX {player.annual.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      UGX {player.monthly.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      UGX {player.pitch.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditPlayer(player)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit {player.name}</span>
                        </button>
                        <button 
                          onClick={() => handleDeletePlayer(player.id, player.name)}
                          disabled={isDeleting === player.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          {isDeleting === player.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete {player.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPlayers.length)} of {filteredPlayers.length} players
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

      {/* Edit Player Modal */}
      {selectedPlayer && (
        <EditPlayerModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          player={selectedPlayer}
          onPlayerUpdated={handlePlayerUpdated}
        />
      )}
    </div>
  )
}

export default PlayersList