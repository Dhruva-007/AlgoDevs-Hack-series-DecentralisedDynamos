"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import algosdk from "algosdk"
import Link from "next/link"

interface LeaderboardUser {
  address: string
  wins: number
  rank: number
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  async function fetchLeaderboardData() {
    setLoading(true)
    setError(null)
    try {
      const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
      const appID = 739937829 // The app ID that stores winner data

      // Search for application boxes
      const boxesResp = await indexer.searchForApplicationBoxes(appID).do()
      console.log("Leaderboard boxes response:", boxesResp)

      const leaderboardUsers: LeaderboardUser[] = []

      for (const box of boxesResp.boxes) {
        try {
          // Decode box.name - this contains the user's address
          const nameBuf =
            typeof box.name === "string"
              ? Buffer.from(box.name, "base64")
              : Buffer.from(
                  (box.name as Uint8Array).buffer,
                  (box.name as Uint8Array).byteOffset,
                  (box.name as Uint8Array).byteLength,
                )

          // Fetch box value
          const valResp = await indexer
            .lookupApplicationBoxByIDandName(
              appID,
              new Uint8Array(nameBuf.buffer, nameBuf.byteOffset, nameBuf.byteLength),
            )
            .do()

          // Normalize to Buffer
          let valueBuf: Buffer
          if (typeof valResp.value === "string") {
            valueBuf = Buffer.from(valResp.value, "base64")
          } else {
            const u8 = valResp.value as Uint8Array
            valueBuf = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
          }

          // Log raw box value for debugging
          console.log("Raw box value bytes:", Array.from(valueBuf))
          console.log("Raw box value hex:", valueBuf.toString("hex"))

          // Try to convert the box name to an Algorand address
          try {
            // If the name is 32 bytes, it might be a public key
            if (nameBuf.length === 32) {
              const addr = algosdk.encodeAddress(new Uint8Array(nameBuf))

              // Use ABI type to decode the uint64 value (number of wins)
              try {
                const uint64AbiType = algosdk.ABIType.from("uint64")

                // Decode the buffer containing the encoded number of wins
                const wins = uint64AbiType.decode(valueBuf)

                console.log(`Decoded wins for ${addr}:`, wins)

                leaderboardUsers.push({
                  address: addr,
                  wins: Number(wins), // Convert BigInt to Number
                  rank: 0, // Will be calculated after sorting
                })
              } catch (decodeErr) {
                console.error("Error decoding uint64 value:", decodeErr)
              }
            }
          } catch (addrErr) {
            console.error("Error converting box name to address:", addrErr)
          }
        } catch (boxErr) {
          console.error("Error processing box:", boxErr)
        }
      }

      // Sort users by number of wins (descending)
      const sortedUsers = leaderboardUsers.sort((a, b) => b.wins - a.wins)

      // Assign ranks
      sortedUsers.forEach((user, index) => {
        user.rank = index + 1
      })

      setUsers(sortedUsers)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching leaderboard data:", err)
      setError("Failed to fetch leaderboard data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Format Algorand address for display (truncate middle)
  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Get trophy icon based on rank
  const getTrophyIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-700" />
      default:
        return null
    }
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-black/40 backdrop-blur-lg border-indigo-400/20">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-white mb-2">Developer Leaderboard</CardTitle>
              <p className="text-indigo-300">Top bounty winners ranked by number of successful submissions</p>
            </div>
            <Button
              variant="outline"
              className="mt-4 md:mt-0 border-indigo-400/30 text-indigo-300 hover:bg-indigo-900/30"
              onClick={fetchLeaderboardData}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-indigo-300">Loading leaderboard data...</span>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-400">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4 border-red-500/30 text-red-400 hover:bg-red-900/30"
                  onClick={fetchLeaderboardData}
                >
                  Try Again
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-8 text-center">
                <p className="text-indigo-300 mb-2">No winners found yet</p>
                <p className="text-gray-400 text-sm">
                  Winners will appear here once bounties have been completed and rewards distributed
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {users.slice(0, 3).map((user) => (
                    <Card
                      key={user.address}
                      className={`
                        border-0 shadow-lg overflow-hidden
                        ${
                          user.rank === 1
                            ? "bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border-yellow-500/30"
                            : user.rank === 2
                              ? "bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-500/30"
                              : "bg-gradient-to-br from-amber-900/40 to-amber-950/40 border-amber-700/30"
                        }
                      `}
                    >
                      <div className="p-6 text-center">
                        <div className="flex justify-center mb-4">{getTrophyIcon(user.rank)}</div>
                        <h3 className="text-xl font-bold text-white mb-1">Rank #{user.rank}</h3>
                        <Link
                          href={`https://testnet.explorer.perawallet.app/address/${user.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <p className="text-indigo-300 hover:text-indigo-200 transition-colors mb-4">
                            {formatAddress(user.address)}
                          </p>
                        </Link>
                        <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-sm">
                          {user.wins} {user.wins === 1 ? "Win" : "Wins"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="rounded-xl overflow-hidden border border-indigo-400/20">
                  <Table>
                    <TableHeader className="bg-indigo-900/30">
                      <TableRow className="border-indigo-400/20 hover:bg-transparent">
                        <TableHead className="text-indigo-300 w-16 text-center">Rank</TableHead>
                        <TableHead className="text-indigo-300">Developer</TableHead>
                        <TableHead className="text-indigo-300 text-right">Wins</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.address} className="border-indigo-400/10 hover:bg-indigo-900/20">
                          <TableCell className="font-medium text-center">
                            <span className="flex items-center justify-center">
                              {user.rank <= 3 ? <span className="mr-2">{getTrophyIcon(user.rank)}</span> : null}
                              <span className={user.rank <= 3 ? "text-white font-bold" : "text-gray-400"}>
                                {user.rank}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <Link
                          href={`https://testnet.explorer.perawallet.app/address/${user.address}`}
                          target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-300 hover:text-indigo-200 transition-colors"
                            >
                              {user.address}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">
                              {user.wins} {user.wins === 1 ? "Win" : "Wins"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {lastUpdated && (
                  <p className="text-gray-400 text-sm mt-4 text-right">Last updated: {lastUpdated.toLocaleString()}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
