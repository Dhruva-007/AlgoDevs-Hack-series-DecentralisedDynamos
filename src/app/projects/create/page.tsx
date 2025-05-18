"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Loader2, ArrowLeft, X, Plus, CheckCircle2 } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"

// Initialize Supabase client
const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : null

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

export default function CreateProjectPage() {
  const { activeAccount } = useWallet()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stage: projectStages[0],
    category: projectCategories[0],
    teamsize: 1,
    roles: [""],
  })

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()

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
      if (!supabase) {
        toast.error("Database connection not available")
        return
      }

      // Insert data according to the database schema
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          description: formData.description,
          stage: formData.stage,
          category: formData.category,
          teamsize: formData.teamsize, // lowercase as per schema
          roles: filteredRoles,
          createdby: activeAccount.name || "Anonymous", // lowercase as per schema
          creatoraddress: activeAccount.address, // lowercase as per schema
        })
        .select()

      if (error) throw error

      toast.success("Project created successfully")

      // Redirect to projects page
      router.push("/projects")
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/projects" className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-indigo-400/20">
            <h1 className="text-3xl font-bold text-white mb-6">Create a New Project</h1>
            <p className="text-gray-400 mb-8">
              Share your vision and find team members to help bring it to life on the Algorand blockchain.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-6">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="name" className="text-white">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                  className="bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="description" className="text-white">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your project in detail"
                  className="min-h-[120px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="category" className="text-white">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger id="category" className="bg-black/30 border-indigo-400/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-indigo-400/20 text-white">
                      {projectCategories.map((category) => (
                        <SelectItem
                          key={category}
                          value={category}
                          className="text-white focus:text-white focus:bg-indigo-600/50"
                        >
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="stage" className="text-white">
                    Development Stage <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => setFormData({ ...formData, stage: value })}
                    required
                  >
                    <SelectTrigger id="stage" className="bg-black/30 border-indigo-400/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-indigo-400/20 text-white">
                      {projectStages.map((stage) => (
                        <SelectItem
                          key={stage}
                          value={stage}
                          className="text-white focus:text-white focus:bg-indigo-600/50"
                        >
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="teamsize" className="text-white">
                  Current Team Size <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="teamsize"
                  type="number"
                  min="1"
                  value={formData.teamsize}
                  onChange={(e) => setFormData({ ...formData, teamsize: Number.parseInt(e.target.value) || 1 })}
                  className="bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white">
                    Team Roles Needed <span className="text-red-500">*</span>
                  </Label>
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
                        className="flex-1 bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
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

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/projects">
                  <Button variant="outline" className="border-indigo-400/20 text-white">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={submitting || !activeAccount}
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
