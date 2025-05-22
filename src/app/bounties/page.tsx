"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Users, Search, Plus, Loader2, Filter } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"
import algosdk from "algosdk"
import Image from "next/image"

// Bounty categories
const bountyCategories = ["Development", "Design", "Content", "Community", "Marketing", "Research", "Testing", "Other"]

// Define the BountyConfig type to match the blockchain structure
interface BountyConfig {
  bountyId: bigint
  bountyName: string
  bountyCategory: string
  bountyDescription: string
  bountyCreator: string
  bountyImage: string
  bountyCost: bigint
  endTime: bigint
  submissionCount: bigint
  bountyAppId: bigint
}

// Define the UI Bounty type
interface Bounty {
  id: string
  title: string
  description?: string
  organization?: string
  reward: number
  duein: string
  duedate: string
  participants: number
  featured: boolean
  status: "active" | "in-review" | "completed"
  category: string
  requirements?: string
  creatoraddress: string
  created_at: string
  image?: string
  appId: number
}

// Debug info type
interface DebugInfo {
  appId: number
  boxCount: number
  timestamp: string
}

export default function BountiesPage() {
  const { activeAccount } = useWallet()
  const router = useRouter()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("open")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState({
    totalValue: 0,
    totalBounties: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  useEffect(() => {
    fetchBountiesFromBlockchain()
  }, [activeTab, selectedCategory])

  async function fetchBountiesFromBlockchain() {
    setLoading(true)
    setError(null)
    try {
      const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
      const appId = 739937829 // Bounty Manager App ID

      // Define ABI type for bounty data
      const abiType = algosdk.ABIType.from("(uint64,string,string,string,address,string,uint64,uint64,uint64,uint64)")

      // Search for application boxes
      const boxesResp = await indexer.searchForApplicationBoxes(appId).do()
      console.log("Boxes response:", boxesResp)

      // Store debug info
      setDebugInfo({
        appId,
        boxCount: boxesResp.boxes.length,
        timestamp: new Date().toISOString(),
      })

      if (!boxesResp.boxes || boxesResp.boxes.length === 0) {
        setError("No bounties found in the blockchain. The application may not have any bounties yet.")
        setBounties([])
        setStats({
          totalValue: 0,
          totalBounties: 0,
        })
        setLoading(false)
        return
      }

      const fetchedBounties: Bounty[] = []
      let totalValue = 0

      for (const box of boxesResp.boxes) {
        try {
          // Decode box.name
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
              appId,
              new Uint8Array(nameBuf.buffer, nameBuf.byteOffset, nameBuf.byteLength),
            )
            .do()

          // Normalize to Buffer
          let buf: Buffer
          if (typeof valResp.value === "string") {
            buf = Buffer.from(valResp.value, "base64")
          } else {
            const u8 = valResp.value as Uint8Array
            buf = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
          }

          // ABI Decode with bounty structure
          const decodedTuple = abiType.decode(buf) as [
            bigint, // 0: BountyID
            string, // 1: BountyName
            string, // 2: BountyCategory
            string, // 3: BountyDescription
            string, // 4: BountyCreator (address)
            string, // 5: BountyImage
            bigint, // 6: BountyCost
            bigint, // 7: EndTime
            bigint, // 8: SubmissionCount
            bigint, // 9: BountyAppID
          ]

          // Map to BountyConfig
          const bountyConfig: BountyConfig = {
            bountyId: decodedTuple[0],
            bountyName: decodedTuple[1],
            bountyCategory: decodedTuple[2],
            bountyDescription: decodedTuple[3],
            bountyCreator: decodedTuple[4],
            bountyImage: decodedTuple[5],
            bountyCost: decodedTuple[6],
            endTime: decodedTuple[7],
            submissionCount: decodedTuple[8],
            bountyAppId: decodedTuple[9],
          }

          console.log("Decoded bounty:", bountyConfig)

          // Calculate due date and "due in" string
          const endTimeDate = new Date(Number(bountyConfig.endTime) * 1000)
          const now = new Date()
          const diffTime = endTimeDate.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          const dueIn = diffDays <= 0 ? "Expired" : `${diffDays}d`

          // Determine status based on end time and submission count
          let status: "active" | "in-review" | "completed" = "active"
          if (diffDays <= 0) {
            status = "completed"
          } else if (Number(bountyConfig.submissionCount) > 0) {
            status = "in-review"
          }

          // Skip if not matching the selected tab
          if (
            (activeTab === "open" && status !== "active") ||
            (activeTab === "in-review" && status !== "in-review") ||
            (activeTab === "completed" && status !== "completed")
          ) {
            continue
          }

          // Skip if not matching the selected category
          if (selectedCategory && bountyConfig.bountyCategory !== selectedCategory) {
            continue
          }

          // Skip if not matching the search term
          if (searchTerm && !bountyConfig.bountyName.toLowerCase().includes(searchTerm.toLowerCase())) {
            continue
          }

          // Convert to UI Bounty format
          const uiBounty: Bounty = {
            id: bountyConfig.bountyId.toString(),
            title: bountyConfig.bountyName,
            description: bountyConfig.bountyDescription, // Use the actual description from blockchain
            organization: "", // We don't have this in the blockchain data
            reward: Number(bountyConfig.bountyCost),
            duein: dueIn,
            duedate: endTimeDate.toISOString(),
            participants: Number(bountyConfig.submissionCount),
            featured: false, // We don't have this in the blockchain data
            status: status,
            category: bountyConfig.bountyCategory,
            creatoraddress: bountyConfig.bountyCreator,
            created_at: new Date().toISOString(), // We don't have creation time in the blockchain data
            image: bountyConfig.bountyImage,
            appId: Number(bountyConfig.bountyAppId),
          }

          fetchedBounties.push(uiBounty)
          totalValue += Number(bountyConfig.bountyCost)
        } catch (err) {
          console.error("Error processing bounty box:", err)
          // Continue with other boxes
        }
      }

      // Update state with fetched bounties
      setBounties(fetchedBounties)
      setStats({
        totalValue,
        totalBounties: fetchedBounties.length,
      })
    } catch (err) {
      console.error("Error fetching bounties from blockchain:", err)
      setError("Failed to fetch bounties from the blockchain. Please try again later.")
      setBounties([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchBountiesFromBlockchain()
  }

  const navigateToBounty = (id: string, appId: number) => {
    router.push(`/bounty/${appId}`)
  }

  const formatAlgoAmount = (amount: number | string) => {
    return `${amount} ALGO`
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-lg rounded-xl p-6 border border-indigo-500/20">
            <h3 className="text-2xl font-bold text-white">{formatAlgoAmount(stats.totalValue.toLocaleString())}</h3>
            <p className="text-indigo-300">Total Bounties Value </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-lg rounded-xl p-6 border border-indigo-500/20">
            <h3 className="text-2xl font-bold text-white">{stats.totalBounties.toLocaleString()}</h3>
            <p className="text-indigo-300">Opportunities Listed</p>
          </div>
        </div>

        {/* Search and Create */}
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/10">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300 h-5 w-5" />
              <Input
                placeholder="Search bounties by title..."
                className="pl-10 bg-black/30 border-indigo-400/20 text-white h-12 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            {activeAccount && (
              <Link href="/bounties/create">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12 px-6 font-medium rounded-lg w-full md:w-auto">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Bounty
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                className={`${selectedCategory === "" ? "bg-[#1e1033] text-white" : "bg-white text-black"} border-0`}
                onClick={() => setSelectedCategory("")}
              >
                All Opportunities
              </Button>
              {bountyCategories.slice(0, 3).map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  className={`${selectedCategory === category ? "bg-[#1e1033] text-white" : "bg-white text-black"} border-0`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} className="text-indigo-300">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
              {bountyCategories.slice(3).map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  className={`${selectedCategory === category ? "bg-[#1e1033] text-white" : "bg-white text-black"} border-0`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Bounties Tabs */}
        <Tabs defaultValue="open" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-black/40 w-full rounded-xl h-12 p-1">
            <TabsTrigger value="open" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Open
            </TabsTrigger>
            <TabsTrigger value="in-review" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              In Review
            </TabsTrigger>
            <TabsTrigger value="completed" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-6">
            {renderBountyList()}
          </TabsContent>

          <TabsContent value="in-review" className="mt-6">
            {renderBountyList()}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {renderBountyList()}
          </TabsContent>
        </Tabs>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === "development" && debugInfo && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg text-xs text-gray-300">
            <h4 className="font-mono mb-2">Debug Info:</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  )

  function renderBountyList() {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="bg-black/30 rounded-xl border border-red-400/20 p-10 text-center">
          <h3 className="text-xl font-medium text-white mb-2">Error Loading Bounties</h3>
          <p className="text-red-400 mb-6">{error}</p>
          <Button onClick={fetchBountiesFromBlockchain} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )
    }

    if (bounties.length === 0) {
      return (
        <div className="bg-black/30 rounded-xl border border-indigo-400/20 p-10 text-center">
          <h3 className="text-xl font-medium text-white mb-2">No bounties found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
          {activeAccount && (
            <Link href="/bounties/create">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create a New Bounty
              </Button>
            </Link>
          )}
        </div>
      )
    }

    return (
      <div className="grid gap-4">
        {bounties.map((bounty) => (
          <Card
            key={bounty.id}
            className="bg-black/40 border-indigo-400/20 hover:border-indigo-400/50 transition-all overflow-hidden cursor-pointer"
            onClick={() => navigateToBounty(bounty.id, bounty.appId)}
          >
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {bounty.image && (
                  <div className="md:w-1/4 mb-4 md:mb-0">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <Image
                        src={bounty.image || "/placeholder.svg"}
                        alt={bounty.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          const target = e.target as HTMLImageElement
                          target.src = "/treasure-chest-overflowing.png"
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className={`flex-1 ${bounty.image ? "md:w-3/4" : "w-full"}`}>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    {bounty.title}
                  </h3>
                  {bounty.description && <p className="text-gray-300 mb-4 line-clamp-2">{bounty.description}</p>}
                  {bounty.organization && <p className="text-gray-300 mb-4">{bounty.organization}</p>}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge variant="outline" className="bg-indigo-600/20 text-white border-indigo-400/30">
                      {bounty.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Clock className="h-4 w-4" />
                      <span>Due in {bounty.duein}</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Users className="h-4 w-4" />
                      <span>{bounty.participants} submissions</span>
                    </div>
                    {bounty.featured && (
                      <div className="flex items-center gap-2 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>FEATURED</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="mb-4 md:mb-0">
                      <p className="text-xl font-bold text-white">{formatAlgoAmount(bounty.reward)}</p>
                      <p className="text-sm text-gray-400">App ID: {bounty.appId}</p>
                    </div>

                    <div className="flex flex-col md:items-end">
                      <Badge
                        variant="secondary"
                        className={
                          bounty.status === "active"
                            ? "bg-green-500/20 text-green-500"
                            : bounty.status === "in-review"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-blue-500/20 text-blue-500"
                        }
                      >
                        {bounty.status === "active"
                          ? "Active"
                          : bounty.status === "in-review"
                            ? "In Review"
                            : "Completed"}
                      </Badge>

                      {bounty.status === "active" && activeAccount && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/bounty/${bounty.appId}/apply`)
                          }}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white w-full md:w-auto mt-4"
                        >
                          Apply for Bounty
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }
}
