"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Clock, Users, ArrowLeft, Loader2, CheckCircle, AlertCircle, User, Calendar, Award } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import algosdk from "algosdk"
import Image from "next/image"
import { format } from "date-fns"

// Update the BountyConfig interface to include bountyDescription
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

// Define the Submission type
interface Submission {
  id: string
  submitter: string
  submissionTime: Date
  description: string
  status: "pending" | "accepted" | "rejected"
}

export default function BountyDetailsPage({ params }: { params: { id: string } }) {
  const { activeAccount } = useWallet()
  const router = useRouter()
  const [bounty, setBounty] = useState<BountyConfig | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetchBountyDetails()
  }, [params.id])

  async function fetchBountyDetails() {
    setLoading(true)
    setError(null)
    try {
      const appId = Number.parseInt(params.id)
      if (isNaN(appId)) {
        throw new Error("Invalid bounty ID")
      }

      const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
      const managerAppId = 739937829 // Bounty Manager App ID

      // Update the ABI type definition
      const abiType = algosdk.ABIType.from("(uint64,string,string,string,address,string,uint64,uint64,uint64,uint64)")

      // Search for the specific bounty in the manager's boxes
      const boxesResp = await indexer.searchForApplicationBoxes(managerAppId).do()

      if (!boxesResp.boxes || boxesResp.boxes.length === 0) {
        throw new Error("No bounties found in the blockchain")
      }

      let foundBounty = null

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
              managerAppId,
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

          // Update the ABI Decode section in fetchBountyDetails function
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

          // Check if this is the bounty we're looking for
          if (Number(bountyConfig.bountyAppId) === appId) {
            foundBounty = bountyConfig
            break
          }
        } catch (err) {
          console.error("Error processing bounty box:", err)
          // Continue with other boxes
        }
      }

      if (!foundBounty) {
        throw new Error("Bounty not found")
      }

      setBounty(foundBounty)

      // Fetch submissions (mock data for now)
      // In a real implementation, you would fetch this from the blockchain
      const mockSubmissions: Submission[] = []
      const submissionCount = Number(foundBounty.submissionCount)

      if (submissionCount > 0) {
        // Generate mock submissions based on the submission count
        for (let i = 0; i < submissionCount; i++) {
          mockSubmissions.push({
            id: `submission-${i + 1}`,
            submitter: `ALGO${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            submissionTime: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in the last week
            description:
              "This submission includes a complete implementation of the requested feature with documentation and tests.",
            status: i === 0 ? "accepted" : i === 1 ? "rejected" : "pending",
          })
        }
      }

      setSubmissions(mockSubmissions)
    } catch (err) {
      console.error("Error fetching bounty details:", err)
      setError(`Failed to fetch bounty details: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyForBounty = async () => {
    if (!activeAccount) {
      alert("Please connect your wallet to apply for this bounty")
      return
    }

    setApplying(true)
    try {
      // In a real implementation, you would call the smart contract to apply for the bounty
      // For now, we'll just simulate a delay and redirect
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Redirect to the apply page
      router.push(`/bounty/${params.id}/apply`)
    } catch (err) {
      console.error("Error applying for bounty:", err)
      alert("Failed to apply for bounty. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  const formatAlgoAmount = (amount: bigint | number) => {
    return `${amount} ALGO`
  }

  const getBountyStatus = (): { status: string; color: string } => {
    if (!bounty) return { status: "Unknown", color: "bg-gray-500/20 text-gray-500" }

    const now = new Date()
    const endTime = new Date(Number(bounty.endTime) * 1000)

    if (now > endTime) {
      return { status: "Completed", color: "bg-blue-500/20 text-blue-500" }
    } else if (Number(bounty.submissionCount) > 0) {
      return { status: "In Review", color: "bg-yellow-500/20 text-yellow-500" }
    } else {
      return { status: "Active", color: "bg-green-500/20 text-green-500" }
    }
  }

  const isExpired = bounty ? new Date() > new Date(Number(bounty.endTime) * 1000) : false
  const isCreator = bounty && activeAccount ? activeAccount.address === bounty.bountyCreator : false
  const bountyStatus = getBountyStatus()

  if (loading) {
    return (
      <main className="min-h-screen animated-gradient pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen animated-gradient pt-20">
        <div className="container mx-auto px-4 py-8">
          <Link href="/bounties" className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Link>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-red-400/20 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Error Loading Bounty</h1>
            <p className="text-red-400 mb-6">{error}</p>
            <Button onClick={fetchBountyDetails} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Loader2 className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!bounty) {
    return (
      <main className="min-h-screen animated-gradient pt-20">
        <div className="container mx-auto px-4 py-8">
          <Link href="/bounties" className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Link>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-indigo-400/20 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Bounty Not Found</h1>
            <p className="text-gray-400 mb-6">The bounty you're looking for doesn't exist or has been removed.</p>
            <Link href="/bounties">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">View All Bounties</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <Link href="/bounties" className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bounties
        </Link>

        {/* Bounty Header */}
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-indigo-400/20 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Bounty Image */}
            {bounty.bountyImage && (
              <div className="md:w-1/3">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <Image
                    src={bounty.bountyImage || "/placeholder.svg"}
                    alt={bounty.bountyName}
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

            {/* Bounty Info */}
            <div className={`${bounty.bountyImage ? "md:w-2/3" : "w-full"}`}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-indigo-600/20 text-white border-indigo-400/30">
                  {bounty.bountyCategory}
                </Badge>
                <Badge variant="secondary" className={bountyStatus.color}>
                  {bountyStatus.status}
                </Badge>
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">{bounty.bountyName}</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-300 mb-3">
                    <User className="h-5 w-5" />
                    <span className="text-gray-300">Created by:</span>
                    <span className="text-white font-mono">{`${bounty.bountyCreator.slice(0, 6)}...${bounty.bountyCreator.slice(-4)}`}</span>
                  </div>

                  <div className="flex items-center gap-2 text-indigo-300 mb-3">
                    <Calendar className="h-5 w-5" />
                    <span className="text-gray-300">Deadline:</span>
                    <span className="text-white">{format(new Date(Number(bounty.endTime) * 1000), "PPP")}</span>
                  </div>

                  <div className="flex items-center gap-2 text-indigo-300">
                    <Users className="h-5 w-5" />
                    <span className="text-gray-300">Submissions:</span>
                    <span className="text-white">{bounty.submissionCount.toString()}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-indigo-300 mb-3">
                    <Award className="h-5 w-5" />
                    <span className="text-gray-300">Reward:</span>
                    <span className="text-white text-xl font-bold">{formatAlgoAmount(bounty.bountyCost)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-indigo-300 mb-3">
                    <Clock className="h-5 w-5" />
                    <span className="text-gray-300">Status:</span>
                    <span className="text-white">
                      {isExpired
                        ? "Expired"
                        : `${Math.ceil((Number(bounty.endTime) * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} days remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {!isExpired && !isCreator && activeAccount && (
                  <Button
                    onClick={handleApplyForBounty}
                    disabled={applying}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply for Bounty"
                    )}
                  </Button>
                )}

                {isCreator && (
                  <Link href={`/bounty/manage/${params.id}`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Manage Bounty</Button>
                  </Link>
                )}

                <Button variant="outline" className="border-indigo-400/20 text-white">
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bounty Details Tabs */}
        <Tabs defaultValue="details" className="mb-8">
          <TabsList className="bg-black/40 w-full rounded-xl h-12 p-1">
            <TabsTrigger value="details" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Details
            </TabsTrigger>
            <TabsTrigger value="submissions" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Submissions ({bounty.submissionCount.toString()})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            {/* Update the Details tab content to display the bounty description */}
            <Card className="bg-black/40 border-indigo-400/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Bounty Description</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300">
                    {bounty.bountyDescription ||
                      "This bounty is looking for developers to implement the requested functionality according to the specifications. The solution should be well-documented and include comprehensive tests."}
                  </p>

                  <h3 className="text-lg font-semibold text-white mt-6 mb-2">Requirements</h3>
                  <ul className="list-disc pl-5 text-gray-300 space-y-2">
                    <li>Implement the core functionality as described</li>
                    <li>Provide comprehensive documentation</li>
                    <li>Include unit tests with at least 80% coverage</li>
                    <li>Follow best practices for code quality and security</li>
                    <li>Submit a working demo or proof of concept</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-white mt-6 mb-2">Submission Guidelines</h3>
                  <p className="text-gray-300">
                    To submit your solution, apply for this bounty and you will receive instructions on how to submit
                    your work. All submissions must include source code, documentation, and a brief explanation of your
                    approach.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <Card className="bg-black/40 border-indigo-400/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Submissions</h2>

                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="border border-indigo-400/20 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-400" />
                            <span className="text-white font-mono">{`${submission.submitter.slice(0, 6)}...${submission.submitter.slice(-4)}`}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              submission.status === "accepted"
                                ? "bg-green-500/20 text-green-500"
                                : submission.status === "rejected"
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-yellow-500/20 text-yellow-500"
                            }
                          >
                            {submission.status === "accepted"
                              ? "Accepted"
                              : submission.status === "rejected"
                                ? "Rejected"
                                : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-gray-300 mb-2">{submission.description}</p>
                        <p className="text-sm text-gray-400">Submitted on {format(submission.submissionTime, "PPP")}</p>

                        {isCreator && submission.status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle className="h-4 w-4 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="destructive">
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Related Bounties */}
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-6 border border-indigo-400/20">
          <h2 className="text-xl font-bold text-white mb-4">Similar Bounties</h2>
          <p className="text-gray-400">Check out other bounties in the {bounty.bountyCategory} category.</p>
          <div className="mt-4">
            <Link href="/bounties">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">View All Bounties</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
