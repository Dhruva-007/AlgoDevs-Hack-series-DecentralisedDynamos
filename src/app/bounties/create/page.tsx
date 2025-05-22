"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { format, addDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, ArrowLeft, Upload, ImageIcon, X } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { BountyFactory } from "@/contracts/BountyClient"
import { BountyClient } from "@/contracts/BountyClient"
import { BountyManagerClient } from "@/contracts/BountyManagerClient"
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount"
import Image from "next/image"
import axios from "axios"

// Bounty categories
const bountyCategories = ["Development", "Design", "Content", "Community", "Marketing", "Research", "Testing", "Other"]

// Pinata API configuration
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT

export default function CreateBountyPage() {
  const { activeAccount, transactionSigner } = useWallet()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 7)) // Default to 7 days from now
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organization: "",
    reward: 100,
    category: bountyCategories[0],
    requirements: "",
    featured: false,
    image: null as File | null,
    imagePreview: "",
    ipfsHash: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size too large", {
        description: "Please select an image smaller than 5MB",
      })
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please select an image file",
      })
      return
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)

    setFormData({
      ...formData,
      image: file,
      imagePreview: previewUrl,
    })
  }

  const removeImage = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview)
    }

    setFormData({
      ...formData,
      image: null,
      imagePreview: "",
      ipfsHash: "",
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadToIPFS = async (file: File): Promise<string> => {
    if (!PINATA_JWT) {
      throw new Error("Pinata JWT not configured")
    }

    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const metadata = JSON.stringify({
        name: `bounty-image-${Date.now()}`,
      })
      formData.append("pinataMetadata", metadata)

      const options = JSON.stringify({
        cidVersion: 0,
      })
      formData.append("pinataOptions", options)

      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          "Content-Type": "multipart/form-data",
        },
      })

      const ipfsHash = res.data.IpfsHash
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`

      toast.success("Image uploaded to IPFS", {
        description: "Your image has been successfully uploaded",
      })

      return ipfsUrl
    } catch (error) {
      console.error("Error uploading to IPFS:", error)
      throw new Error("Failed to upload image to IPFS")
    } finally {
      setUploadingImage(false)
    }
  }

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
      // Upload image to IPFS if provided
      let ipfsUrl = ""
      if (formData.image) {
        try {
          ipfsUrl = await uploadToIPFS(formData.image)
        } catch (error) {
          toast.error("Failed to upload image", {
            description: "Please try again or proceed without an image",
          })
          setSubmitting(false)
          return
        }
      }

      const activeAddress = activeAccount.address

      // Calculate end time in Unix timestamp (seconds)
      const endTime = Math.floor(date!.getTime() / 1000)

      // Generate a unique bounty ID
      const bountyId = Math.floor(Math.random() * 1000000000)

      // Initialize Algorand client
      const algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
        indexerConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
      })

      toast.info("Creating bounty application on the blockchain...", { autoClose: false })

      // Create application using BountyFactory
      const appFactory = new BountyFactory({
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
        algorand,
      })

      const { result, appClient } = await appFactory.send.create.createApplication({
        sender: activeAddress,
        signer: transactionSigner,
        args: [formData.title, formData.category, BigInt(endTime)],
      })

      // Get application reference
      const appID = await appClient.appId
      const appAddress = await appClient.appAddress.toString()

      toast.info(`Bounty application created with ID: ${appID}`, { autoClose: 2000 })

      // Get the bounty manager client (assuming you have a manager app with a fixed ID)
      const managerClient = algorand.client.getTypedAppClientById(BountyManagerClient, {
        appId: BigInt(739937829), // Replace with your actual bounty manager app ID
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
      })

      // Get the bounty client for the newly created app
      const bountyClient = algorand.client.getTypedAppClientById(BountyClient, {
        appId: BigInt(appID),
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
      })

      // Create the bounty on the blockchain
      await algorand
        .newGroup()
        .addAppCallMethodCall(
          await managerClient.params.createBounty({
            args: {
              bountyConfig: {
                bountyId: BigInt(bountyId),
                bountyName: formData.title,
                bountyCategory: formData.category,
                bountyDescription: formData.description,
                bountyCreator: activeAddress,
                bountyImage: ipfsUrl, // Use the IPFS URL for the image
                bountyCost: BigInt(formData.reward),
                endTime: BigInt(endTime),
                submissionCount: BigInt(0),
                bountyAppId: BigInt(appID),
              },
            },
          }),
        )
        .addPayment({
          sender: activeAddress,
          receiver: appAddress,
          amount: AlgoAmount.Algo(3), // Funding the bounty app
          signer: transactionSigner,
        })
        .send({ populateAppCallResources: true })

      toast.success("Bounty created successfully on the blockchain!")

      // Redirect to bounties page
      router.push("/bounties")
    } catch (error) {
      console.error("Error creating bounty on blockchain:", error)
      toast.error("Failed to create bounty on the blockchain")
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

              {/* Image Upload Section */}
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="image" className="text-white">
                  Bounty Image
                </Label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-400/30 rounded-lg p-6 bg-black/20">
                  <input
                    type="file"
                    id="image"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {formData.imagePreview ? (
                    <div className="relative w-full max-w-md">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <Image
                          src={formData.imagePreview || "/placeholder.svg"}
                          alt="Bounty image preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 rounded-full bg-indigo-500/20">
                        <ImageIcon className="h-8 w-8 text-indigo-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-300">Drag and drop an image, or</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 border-indigo-400/30 text-indigo-300 hover:text-indigo-200"
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Browse Files
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">Recommended: 1200×630px or larger. Max size: 5MB.</p>
                    </div>
                  )}
                </div>
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
                  disabled={submitting || uploadingImage || !activeAccount}
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
