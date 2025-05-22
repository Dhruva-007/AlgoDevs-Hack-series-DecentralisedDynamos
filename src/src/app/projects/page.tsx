"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, X, CheckCircle2, Loader2 } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

// Define Project interface
interface Project {
  id: number
  name: string
  description: string
  stage: string
  category: string
  teamSize: number
  roles: string[]
  createdBy: string
  creatorAddress: string
  created_at: string
}

// Project stages
const projectStages = ["Idea Stage", "Proof of Concept", "Building MVP", "Beta Testing", "Launched"]

// Project categories
const projectCategories = [
  "DeFi",
  "NFT",
  "Gaming",
  "DAO",
  "Infrastructure",
  "Social",
  "Marketplace",
  "Tooling",
  "Analytics",
  "E-Commerce",
  "Creativity",
  "Education",
  "Other",
]

export default function ProjectsPage() {
  const { activeAccount } = useWallet()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedTeamSize, setSelectedTeamSize] = useState("")
  const [showMyProjects, setShowMyProjects] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stage: projectStages[0],
    category: projectCategories[0],
    teamSize: 1,
    roles: [""],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    try {
      let query = supabase.from("projects").select("*")

      // Apply search filter if provided
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Apply category filter if selected
      if (selectedCategory) {
        query = query.eq("category", selectedCategory)
      }

      // Apply team size filter if selected
      if (selectedTeamSize) {
        if (selectedTeamSize === "1") {
          query = query.eq("teamSize", 1)
        } else if (selectedTeamSize === "2-5") {
          query = query.gte("teamSize", 2).lte("teamSize", 5)
        } else if (selectedTeamSize === "5+") {
          query = query.gt("teamSize", 5)
        }
      }

      // Filter for my projects if selected
      if (showMyProjects && activeAccount) {
        query = query.eq("creatorAddress", activeAccount.address)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast.error("Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchProjects()
  }

  const toggleMyProjects = () => {
    setShowMyProjects(!showMyProjects)
    // Refresh projects with new filter
    setTimeout(fetchProjects, 0)
  }

  const handleCreateProject = async () => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to create a project", {
        description: "Authentication Required",
      })
      return
    }

    // Validation
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields", {
        description: "Validation Error",
      })
      return
    }

    // Filter out empty roles
    const filteredRoles = formData.roles.filter((role) => role.trim() !== "")
    if (filteredRoles.length === 0) {
      toast.error("Please add at least one role", {
        description: "Validation Error",
      })
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          description: formData.description,
          stage: formData.stage,
          category: formData.category,
          teamSize: formData.teamSize,
          roles: filteredRoles,
          createdBy: activeAccount.name || "Anonymous",
          creatorAddress: activeAccount.address,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      toast.success("Project created successfully")

      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        stage: projectStages[0],
        category: projectCategories[0],
        teamSize: 1,
        roles: [""],
      })
      setIsCreateModalOpen(false)

      // Refresh projects
      fetchProjects()
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  const addRoleField = () => {
    setFormData({
      ...formData,
      roles: [...formData.roles, ""],
    })
  }

  const removeRoleField = (index: number) => {
    const updatedRoles = [...formData.roles]
    updatedRoles.splice(index, 1)
    setFormData({
      ...formData,
      roles: updatedRoles,
    })
  }

  const updateRole = (index: number, value: string) => {
    const updatedRoles = [...formData.roles]
    updatedRoles[index] = value
    setFormData({
      ...formData,
      roles: updatedRoles,
    })
  }

  const applyForRole = async (projectId: number, role: string) => {
    if (!activeAccount) {
      toast.error("Please connect your wallet to apply for a role", {
        description: "Authentication Required",
      })
      return
    }

    try {
      const { data, error } = await supabase.from("applications").insert({
        project_id: projectId,
        role: role,
        applicant_address: activeAccount.address,
        applicant_name: activeAccount.name || "Anonymous",
        status: "pending",
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      toast.success("Application submitted successfully")
    } catch (error) {
      console.error("Error applying for role:", error)
      toast.error("Failed to submit application")
    }
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/10">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300 h-5 w-5" />
              <Input
                placeholder="Search for a specific project..."
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
                Create Project
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              variant={showMyProjects ? "default" : "outline"}
              onClick={toggleMyProjects}
              className={`${showMyProjects ? "bg-[#1e1033] text-white" : "bg-white text-black"} border-0 font-medium`}
              disabled={!activeAccount}
            >
              MY PROJECTS
            </Button>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] bg-white text-black border-0 h-11 rounded-lg">
                <SelectValue placeholder="CATEGORY" />
              </SelectTrigger>
              <SelectContent className="bg-white border-0">
                <SelectItem value="all">All Categories</SelectItem>
                {projectCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTeamSize} onValueChange={setSelectedTeamSize}>
              <SelectTrigger className="w-[180px] bg-white text-black border-0 h-11 rounded-lg">
                <SelectValue placeholder="TEAM SIZE" />
              </SelectTrigger>
              <SelectContent className="bg-white border-0">
                <SelectItem value="any">Any Size</SelectItem>
                <SelectItem value="1">1 Member</SelectItem>
                <SelectItem value="2-5">2-5 Members</SelectItem>
                <SelectItem value="5+">5+ Members</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleSearch} className="bg-white text-black border-0">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-black/40 border-indigo-400/20 overflow-hidden group hover:border-indigo-400/50 transition-all"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none py-1 px-3">
                      {project.stage}
                    </Badge>
                    <span className="text-indigo-300 text-sm">{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-gray-300 mb-4 line-clamp-3">{project.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-300">Category:</span>
                      <span className="text-white">{project.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-300">Team Size:</span>
                      <span className="text-white">{project.teamSize}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-300">Created By:</span>
                      <span className="text-white">{project.createdBy}</span>
                    </div>
                  </div>

                  {project.roles && project.roles.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="text-sm font-medium text-indigo-300 mb-2">Open Roles:</h4>
                      {project.roles.map((role: string) => (
                        <Button
                          key={role}
                          onClick={() => applyForRole(project.id, role)}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                          disabled={!activeAccount}
                        >
                          Apply for {role} role
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-black/30 rounded-xl border border-indigo-400/20 p-10 text-center">
            <h3 className="text-xl font-medium text-white mb-2">No projects found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
            {activeAccount && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create a New Project
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-black/95 border-indigo-400/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Create a New Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your vision and find team members to help bring it to life on the Algorand blockchain.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="bg-black/50 border-b border-indigo-400/20 w-full rounded-none justify-start mb-6">
              <TabsTrigger value="details" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                Project Details
              </TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                Team Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="name" className="text-white">
                    Project Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter project name"
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
                    placeholder="Describe your project in detail"
                    className="min-h-[120px] bg-black/30 border-indigo-400/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        {projectCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="stage" className="text-white">
                      Development Stage
                    </Label>
                    <Select
                      value={formData.stage}
                      onValueChange={(value) => setFormData({ ...formData, stage: value })}
                    >
                      <SelectTrigger id="stage" className="bg-black/30 border-indigo-400/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-indigo-400/20">
                        {projectStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="teamSize" className="text-white">
                    Current Team Size
                  </Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min="1"
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: Number.parseInt(e.target.value) || 1 })}
                    className="bg-black/30 border-indigo-400/20"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-0">
              <div className="grid gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white">Team Roles Needed</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRoleField}
                      className="h-8 border-indigo-400/20 text-indigo-300"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Role
                    </Button>
                  </div>

                  <ScrollArea className="max-h-[200px] pr-4">
                    {formData.roles.map((role, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          value={role}
                          onChange={(e) => updateRole(index, e.target.value)}
                          placeholder="e.g., Developer, Designer, Marketing"
                          className="flex-1 bg-black/30 border-indigo-400/20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRoleField(index)}
                          disabled={formData.roles.length <= 1}
                          className="h-10 w-10 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="bg-indigo-500/10 p-4 rounded-lg border border-indigo-400/20">
                  <h4 className="text-indigo-300 text-sm font-medium mb-2 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Why define team roles?
                  </h4>
                  <p className="text-gray-400 text-sm">
                    Clearly defined roles help attract the right collaborators for your project. Be specific about the
                    skills and commitment level you're looking for.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="border-indigo-400/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={submitting}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

