"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Users, Search, Plus, Loader2, Filter } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

// Bounty categories
const bountyCategories = ["Development", "Design", "Content", "Community", "Marketing", "Research", "Testing", "Other"]

// Define the Bounty type
interface Bounty {
  id: number
  title: string
  description: string
  organization: string
  reward: number
  dueIn: string
  dueDate: string
  participants: number
  featured: boolean
  status: "active" | "in-review" | "completed"
  category: string
  requirements?: string
  creatorAddress: string
  created_at: string
}

export default function BountiesPage() {
  const { activeAccount } = useWallet()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organization: "",
    reward: 100,
    dueDate: "",
    category: bountyCategories[0],
    requirements: "",
    featured: false,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchBounties()
    fetchStats()
  }, [activeTab])

  async function fetchStats() {
    try {
      // Get total bounties count
      const { count: totalBounties } = await supabase.from("bounties").select("*", { count: "exact", head: true })

      // Get sum of all rewards
      const { data: rewardData } = await supabase.from("bounties").select("reward")

      const totalValue = rewardData?.reduce((sum, item) => sum + item.reward, 0) || 0

      setStats({
        totalValue,
        totalBounties: totalBounties || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  async function fetchBounties() {
    setLoading(true)
    try {
      let query = supabase.from("bounties").select("*")

      // Apply status filter based on active tab
      if (activeTab === "open") {
        query = query.eq("status", "active")
      } else if (activeTab === "in-review") {
        query = query.eq("status", "in-review")
      } else if (activeTab === "completed") {
        query = query.eq("status", "completed")
      }

      // Apply search filter if provided
      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,organization.ilike.%${searchTerm}%`,
        )
      }

      // Apply category filter if selected
      if (selectedCategory) {
        query = query.eq("category", selectedCategory)
      }

      const { data, error } = await query
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      setBounties(data || [])
    } catch (error) {
      console.error("Error fetching bounties:", error)
      toast.error("Failed to fetch bounties")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchBounties()
  }

  const handleCreateBounty = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to create a bounty", {
        description: "Authentication Required",
      })
      return
    }

    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.dueDate || formData.reward <= 0) {
      toast.error("Please fill in all required fields with valid values", {
        description: "Validation Error",
      })
      return
    }

    setSubmitting(true)
    try {
      // Calculate due days from now
      const dueDate = new Date(formData.dueDate)
      const today = new Date()
      const diffTime = Math.abs(dueDate.getTime() - today.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const dueIn = diffDays <= 0 ? "1d" : `${diffDays}d`

      const { data, error } = await supabase
        .from("bounties")
        .insert({
          title: formData.title,
          organization: formData.organization || activeAccount.name || "Anonymous",
          description: formData.description,
          reward: formData.reward,
          dueIn: dueIn,
          dueDate: formData.dueDate,
          participants: 0,
          featured: formData.featured,
          status: "active",
          category: formData.category,
          requirements: formData.requirements,
          creatorAddress: activeAccount.address,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      toast.success("Bounty created successfully")

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        organization: "",
        reward: 100,
        dueDate: "",
        category: bountyCategories[0],
        requirements: "",
        featured: false,
      })
      setIsCreateModalOpen(false)

      // Refresh bounties
      fetchBounties()
      fetchStats()
    } catch (error) {
      console.error("Error creating bounty:", error)
      toast.error("Failed to create bounty")
    } finally {
      setSubmitting(false)
    }
  }

  const applyForBounty = async (bountyId: number) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to apply for a bounty", {
        description: "Authentication Required",
      })
      return
    }

    try {
      // Check if already applied
      const { data: existingApplications } = await supabase
        .from("bounty_applications")
        .select("*")
        .eq("bounty_id", bountyId)
        .eq("applicant_address", activeAccount.address)
        .single()

      if (existingApplications) {
        toast.info("You have already applied for this bounty", {
          description: "Already Applied",
        })
        return
      }

      // Create application
      const { error } = await supabase.from("bounty_applications").insert({
        bounty_id: bountyId,
        applicant_address: activeAccount.address,
        applicant_name: activeAccount.name || "Anonymous",
        status: "pending",
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      // Update participants count
      const { error: updateError } = await supabase.rpc("increment_bounty_participants", {
        bounty_id: bountyId,
      })

      if (updateError) throw updateError

      toast.success("Application submitted successfully")

      // Refresh bounties
      fetchBounties()
    } catch (error) {
      console.error("Error applying for bounty:", error)
      toast.error("Failed to submit application")
    }
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
                placeholder="Search bounties by title, description, or organization..."
                className="pl-10 bg-black/30 border-indigo-400/20 text-white h-12 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            {activeAccount && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12 px-6 font-medium rounded-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Bounty
              </Button>
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
      </div>

      {/* Create Bounty Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-black/95 border-indigo-400/30 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Create a New Bounty</DialogTitle>
            <DialogDescription className="text-gray-400">
              Post a task or challenge for the Algorand community to solve and earn rewards.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="title" className="text-white">
                Bounty Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter a clear, descriptive title"
                className="bg-black/30 border-indigo-400/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="description" className="text-white">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what needs to be done in detail"
                className="min-h-[120px] bg-black/30 border-indigo-400/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="organization" className="text-white">
                  Organization (Optional)
                </Label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Your organization name if applicable"
                  className="bg-black/30 border-indigo-400/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="category" className="text-white">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" className="bg-black/30 border-indigo-400/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-indigo-400/20">
                    {bountyCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="reward" className="text-white">
                  Reward (ALGO)
                </Label>
                <Input
                  id="reward"
                  type="number"
                  min="1"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: Number.parseFloat(e.target.value) || 0 })}
                  className="bg-black/30 border-indigo-400/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="dueDate" className="text-white">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="bg-black/30 border-indigo-400/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="requirements" className="text-white">
                Submission Requirements
              </Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Specify what the submission should include"
                className="min-h-[100px] bg-black/30 border-indigo-400/20"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                />
                <Label htmlFor="featured" className="text-white cursor-pointer">
                  Featured Bounty
                </Label>
              </div>
              <span className="text-indigo-300 text-sm">+10 ALGO fee applies</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="border-indigo-400/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBounty}
              disabled={submitting}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Bounty"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

    if (bounties.length === 0) {
      return (
        <div className="bg-black/30 rounded-xl border border-indigo-400/20 p-10 text-center">
          <h3 className="text-xl font-medium text-white mb-2">No bounties found</h3>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
          {activeAccount && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create a New Bounty
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="grid gap-4">
        {bounties.map((bounty) => (
          <Card
            key={bounty.id}
            className="bg-black/40 border-indigo-400/20 hover:border-indigo-400/50 transition-all overflow-hidden"
          >
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    {bounty.title}
                  </h3>
                  <p className="text-gray-300 mb-4">{bounty.organization}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="bg-indigo-600/20 text-white border-indigo-400/30">
                      {bounty.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Clock className="h-4 w-4" />
                      <span>Due in {bounty.dueIn}</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Users className="h-4 w-4" />
                      <span>{bounty.participants}</span>
                    </div>
                    {bounty.featured && (
                      <div className="flex items-center gap-2 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span>FEATURED</span>
                      </div>
                    )}
                  </div>

                  {bounty.requirements && (
                    <div className="mt-4 bg-indigo-500/10 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-indigo-300 mb-1">Requirements:</h4>
                      <p className="text-sm text-gray-300">{bounty.requirements}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end justify-between h-full">
                  <div className="text-right mb-4 md:mb-0">
                    <p className="text-xl font-bold text-white mb-2">{formatAlgoAmount(bounty.reward)}</p>
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
                  </div>

                  {bounty.status === "active" && activeAccount && (
                    <Button
                      onClick={() => applyForBounty(bounty.id)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white w-full md:w-auto mt-4 md:mt-0"
                    >
                      Apply for Bounty
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }
}

