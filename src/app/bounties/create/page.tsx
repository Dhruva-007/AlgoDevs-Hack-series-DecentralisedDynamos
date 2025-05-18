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
import { Switch } from "@/components/ui/switch"
import { format, addDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// Initialize Supabase client
const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : null

// Bounty categories
const bountyCategories = ["Development", "Design", "Content", "Community", "Marketing", "Research", "Testing", "Other"]

export default function CreateBountyPage() {
  const { activeAccount } = useWallet()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 7)) // Default to 7 days from now
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organization: "",
    reward: 100,
    category: bountyCategories[0],
    requirements: "",
    featured: false,
  })

  const handleCreateBounty = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeAccount) {
      toast.error("Please connect your wallet to create a bounty", {
        description: "Authentication Required",
      })
      return
    }

    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !date || formData.reward <= 0) {
      toast.error("Please fill in all required fields with valid values", {
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

      // Calculate due days from now
      const today = new Date()
      const diffTime = Math.abs(date.getTime() - today.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const dueIn = diffDays <= 0 ? "1d" : `${diffDays}d`

      // Format date to match the database schema (YYYY-MM-DD)
      const formattedDate = format(date, "yyyy-MM-dd")

      // Insert data according to to the database schema
      const { data, error } = await supabase
        .from("bounties")
        .insert({
          title: formData.title,
          description: formData.description,
          organization: formData.organization || activeAccount.name || "Anonymous",
          reward: formData.reward,
          duein: dueIn, // lowercase field name as per schema
          duedate: formattedDate, // lowercase field name as per schema
          participants: 0,
          featured: formData.featured,
          status: "active",
          category: formData.category,
          requirements: formData.requirements,
          creatoraddress: activeAccount.address, // lowercase field name as per schema
          creatorAddress: activeAccount.address, // quoted field name as per schema
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      toast.success("Bounty created successfully")

      // Redirect to bounties page
      router.push("/bounties")
    } catch (error) {
      console.error("Error creating bounty:", error)
      toast.error("Failed to create bounty")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/bounties" className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Link>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-indigo-400/20">
            <h1 className="text-3xl font-bold text-white mb-6">Create a New Bounty</h1>
            <p className="text-gray-400 mb-8">
              Post a task or challenge for the Algorand community to solve and earn rewards.
            </p>

            <form onSubmit={handleCreateBounty} className="space-y-6">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="title" className="text-white">
                  Bounty Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter a clear, descriptive title"
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
                  placeholder="Describe what needs to be done in detail"
                  className="min-h-[120px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                  required
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
                    className="bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                  />
                </div>

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
                      {bountyCategories.map((category) => (
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="reward" className="text-white">
                    Reward (ALGO) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reward"
                    type="number"
                    min="1"
                    value={formData.reward}
                    onChange={(e) => setFormData({ ...formData, reward: Number.parseFloat(e.target.value) || 0 })}
                    className="bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="dueDate" className="text-white">
                    Due Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="dueDate"
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-black/30 border-indigo-400/20 text-white"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span className="text-gray-400">Select a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-black/90 border-indigo-400/30">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="bg-black text-white"
                      />
                    </PopoverContent>
                  </Popover>
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
                  className="min-h-[100px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
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

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/bounties">
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
                    "Create Bounty"
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
