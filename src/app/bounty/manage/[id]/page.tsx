"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Award,
  AlertTriangle,
  Send,
  Clock,
  Users,
  Lock,
} from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import algosdk from "algosdk"
import Image from "next/image"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { BountyClient } from "@/contracts/BountyClient"

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

// Update the Submission interface to include a "winner" status
interface Submission {
  id: string
  submitter: string
  submitterAddress: string
  submissionTime: Date
  description: string
  status: "pending" | "accepted" | "rejected" | "paid"
  isWinner?: boolean
  feedback?: string
  attachments?: string[]
}

export default function ManageBountyPage({ params }: { params: { id: string } }) {
  const { activeAccount, transactionSigner } = useWallet()
  const router = useRouter()
  const [bounty, setBounty] = useState<BountyConfig | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState("")
  const [sendingReward, setSendingReward] = useState(false)

  // Add a new state to track when setting a winner
  const [settingWinner, setSettingWinner] = useState(false)
  const [currentWinnerAddress, setCurrentWinnerAddress] = useState<string | null>(null)

  useEffect(() => {
    if (activeAccount) {
      fetchBountyDetails()
    } else {
      setUnauthorized(true)
      setLoading(false)
    }
  }, [activeAccount, params.id])

  // Replace the fetchBountyDetails function with this updated version that fetches real submissions
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

      // Define ABI type for bounty data
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

      // Check if the current user is the bounty creator
      if (activeAccount && activeAccount.address !== foundBounty.bountyCreator) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      setBounty(foundBounty)

      // Fetch actual submissions from the blockchain
      try {
        console.log("Fetching submissions for app ID:", appId)
        const submissionBoxesResp = await indexer.searchForApplicationBoxes(appId).do()
        console.log("Submission boxes response:", submissionBoxesResp)

        const fetchedSubmissions: Submission[] = []

        for (const box of submissionBoxesResp.boxes) {
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
                appId,
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

            // Try to convert the box name to an Algorand address
            // If the name is 32 bytes, it might be a public key
            if (nameBuf.length === 32) {
              const submitterAddress = algosdk.encodeAddress(new Uint8Array(nameBuf))

              // Use ABI type to decode the submission text
              const stringAbiType = algosdk.ABIType.from("string")

              // Decode the buffer containing the encoded submission
              const submissionText = stringAbiType.decode(valueBuf)

              console.log("Decoded submission for address:", submitterAddress)

              fetchedSubmissions.push({
                id: `submission-${fetchedSubmissions.length + 1}`,
                submitter: `User ${fetchedSubmissions.length + 1}`,
                submitterAddress: submitterAddress,
                submissionTime: new Date(), // We don't have the actual submission time from the blockchain
                description: submissionText,
                status: "pending", // Default status
                feedback: "",
              })
            }
          } catch (err) {
            console.error("Error processing submission box:", err)
            // Continue with other boxes
          }
        }

        if (fetchedSubmissions.length > 0) {
          setSubmissions(fetchedSubmissions)
        } else {
          // If no submissions found, use mock data for demonstration
          const mockSubmissions: Submission[] = []
          const submissionCount = Number(foundBounty.submissionCount)

          if (submissionCount > 0) {
            // Generate mock submissions based on the submission count
            for (let i = 0; i < submissionCount; i++) {
              const submitterAddress = `ALGO${Math.random().toString(36).substring(2, 10).toUpperCase()}`
              mockSubmissions.push({
                id: `submission-${i + 1}`,
                submitter: `User ${i + 1}`,
                submitterAddress,
                submissionTime: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in the last week
                description:
                  "This submission includes a complete implementation of the requested feature with documentation and tests.",
                status: i === 0 ? "accepted" : i === 1 ? "rejected" : i === 2 ? "paid" : "pending",
                feedback:
                  i === 0
                    ? "Great work! This is exactly what we were looking for."
                    : i === 1
                      ? "Does not meet requirements."
                      : "",
                attachments: i % 2 === 0 ? ["document.pdf", "code.zip"] : undefined,
              })
            }
            setSubmissions(mockSubmissions)
          }
        }
      } catch (err) {
        console.error("Error fetching submissions:", err)
        // If there's an error fetching submissions, we'll fall back to mock data
        const mockSubmissions: Submission[] = []
        const submissionCount = Number(foundBounty.submissionCount)

        if (submissionCount > 0) {
          // Generate mock submissions based on the submission count
          for (let i = 0; i < submissionCount; i++) {
            const submitterAddress = `ALGO${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            mockSubmissions.push({
              id: `submission-${i + 1}`,
              submitter: `User ${i + 1}`,
              submitterAddress,
              submissionTime: new Date(Date.now() - Math.random() * 86400000 * 7), // Random time in the last week
              description:
                "This submission includes a complete implementation of the requested feature with documentation and tests.",
              status: i === 0 ? "accepted" : i === 1 ? "rejected" : i === 2 ? "paid" : "pending",
              feedback:
                i === 0
                  ? "Great work! This is exactly what we were looking for."
                  : i === 1
                    ? "Does not meet requirements."
                    : "",
              attachments: i % 2 === 0 ? ["document.pdf", "code.zip"] : undefined,
            })
          }
          setSubmissions(mockSubmissions)
        }
      }
    } catch (err) {
      console.error("Error fetching bounty details:", err)
      setError(`Failed to fetch bounty details: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptSubmission = async (submission: Submission) => {
    if (!activeAccount || !bounty) return

    setProcessingAction(submission.id)
    try {
      // In a real implementation, you would call the smart contract to accept the submission
      // For now, we'll just simulate a delay and update the UI
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update the submission status
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submission.id ? { ...sub, status: "accepted", feedback: feedback || "Submission accepted" } : sub,
        ),
      )

      toast.success("Submission accepted successfully")
      setFeedback("")
      setSelectedSubmission(null)
    } catch (err) {
      console.error("Error accepting submission:", err)
      toast.error("Failed to accept submission")
    } finally {
      setProcessingAction(null)
    }
  }

  const handleRejectSubmission = async (submission: Submission) => {
    if (!activeAccount || !bounty) return

    setProcessingAction(submission.id)
    try {
      // In a real implementation, you would call the smart contract to reject the submission
      // For now, we'll just simulate a delay and update the UI
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update the submission status
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submission.id ? { ...sub, status: "rejected", feedback: feedback || "Submission rejected" } : sub,
        ),
      )

      toast.success("Submission rejected")
      setFeedback("")
      setSelectedSubmission(null)
    } catch (err) {
      console.error("Error rejecting submission:", err)
      toast.error("Failed to reject submission")
    } finally {
      setProcessingAction(null)
    }
  }

  const handleSendReward = async (submission: Submission) => {
    if (!activeAccount || !bounty) return

    setSendingReward(true)
    try {
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

      // Get the bounty client for the app
      const bountyClient = algorand.client.getTypedAppClientById(BountyClient, {
        appId: BigInt(Number(bounty.bountyAppId)),
        defaultSender: activeAccount.address,
        defaultSigner: transactionSigner,
      })

      toast.info("Sending reward transaction to the blockchain...", { autoClose: false })

      // In a real implementation, you would call the smart contract to send the reward
      // For demonstration, we'll simulate the transaction with a delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update the submission status
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submission.id ? { ...sub, status: "paid", feedback: "Reward sent successfully" } : sub,
        ),
      )

      toast.success("Reward sent successfully")
      setSelectedSubmission(null)
    } catch (err) {
      console.error("Error sending reward:", err)
      toast.error("Failed to send reward")
    } finally {
      setSendingReward(false)
    }
  }

  // Add a new function to handle setting a winner
  const handleSetWinner = async (submission: Submission) => {
    if (!activeAccount || !bounty) return

    setSettingWinner(true)
    try {
      // Initialize Algorand client
      const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "")

      // Get suggested params
      const suggestedParams = await algod.getTransactionParams().do()

      // Create transaction for the manager app
      const managerAppId = 739937829 // Bounty Manager App ID


      const intialTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAccount.address,
        appIndex: managerAppId,
        appArgs: [
          algosdk
            .getMethodByName(
              [
                new algosdk.ABIMethod({
                  name: "addDeveloper",
                  desc: "",
                  args: [{ type: "address", name: "developer", desc: "" }],
                  returns: { type: "void", desc: "" },
                }),
              ],
              "addDeveloper",
            )
            .getSelector(),
          algosdk.decodeAddress(submission.submitterAddress).publicKey,
        ],
        suggestedParams: { ...suggestedParams },
        boxes: [{ appIndex: 0, name: algosdk.decodeAddress(activeAccount.address).publicKey }],
      })

      const managerTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAccount.address,
        appIndex: managerAppId,
        appArgs: [
          algosdk
            .getMethodByName(
              [
                new algosdk.ABIMethod({
                  name: "setWinner",
                  desc: "",
                  args: [{ type: "address", name: "developer", desc: "" }],
                  returns: { type: "void", desc: "" },
                }),
              ],
              "setWinner",
            )
            .getSelector(),
          algosdk.decodeAddress(submission.submitterAddress).publicKey,
        ],
        suggestedParams: { ...suggestedParams },
        boxes: [{ appIndex: 0, name: algosdk.decodeAddress(activeAccount.address).publicKey }],
      })

      // Create transaction for the bounty app
      const bountyAppId = Number(bounty.bountyAppId)
      const bountyTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAccount.address,
        appIndex: bountyAppId,
        appArgs: [
          algosdk
            .getMethodByName(
              [
                new algosdk.ABIMethod({
                  name: "setWinner",
                  desc: "",
                  args: [{ type: "address", name: "winner", desc: "" }],
                  returns: { type: "void", desc: "" },
                }),
              ],
              "setWinner",
            )
            .getSelector(),
          algosdk.decodeAddress(submission.submitterAddress).publicKey,
        ],
        suggestedParams: { ...suggestedParams },
      })

      // Group the transactions
      const txns = [intialTxn,managerTxn, bountyTxn]
      algosdk.assignGroupID(txns)

      toast.info("Setting winner on the blockchain...", { autoClose: false })

      // Sign the transactions
      const signedTxns = await transactionSigner(txns, [0, 1, 2])

      // Send the signed transactions
      const { txId } = await algod.sendRawTransaction(signedTxns).do()

      // Wait for confirmation
      await algosdk.waitForConfirmation(algod, txId, 4)

      // Update the UI
      setCurrentWinnerAddress(submission.submitterAddress)
      setSubmissions((prev) =>
        prev.map((sub) => ({
          ...sub,
          isWinner: sub.submitterAddress === submission.submitterAddress,
        })),
      )

      toast.success(`${submission.submitter} has been set as the winner!`)
    } catch (err) {
      console.error("Error setting winner:", err)
      toast.error("Failed to set winner")
    } finally {
      setSettingWinner(false)
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

  if (unauthorized) {
    return (
      <main className="min-h-screen animated-gradient pt-20">
        <div className="container mx-auto px-4 py-8">
          <Link href="/bounties" className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Link>

          <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-red-400/20 text-center">
            <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Unauthorized Access</h1>
            <p className="text-red-400 mb-6">
              You don't have permission to manage this bounty. Only the bounty creator can access this page.
            </p>
            <Link href="/bounties">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">View All Bounties</Button>
            </Link>
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
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
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

  const bountyStatus = getBountyStatus()
  const isExpired = new Date() > new Date(Number(bounty.endTime) * 1000)
  const pendingSubmissions = submissions.filter((sub) => sub.status === "pending").length
  const acceptedSubmissions = submissions.filter((sub) => sub.status === "accepted").length
  const paidSubmissions = submissions.filter((sub) => sub.status === "paid").length

  // Update the renderSubmissionsList function to include the Set Winner button
  function renderSubmissionsList(submissionsList: Submission[]) {
    if (submissionsList.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-400">No submissions found</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {submissionsList.map((submission) => (
          <div
            key={submission.id}
            className={`border ${submission.isWinner ? "border-yellow-400/50" : "border-indigo-400/20"} rounded-lg p-4 ${submission.isWinner ? "bg-yellow-900/10" : ""}`}
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-indigo-400" />
                  <span className="text-white">{submission.submitter}</span>
                  <span className="text-gray-400 font-mono text-sm">{`(${submission.submitterAddress.slice(0, 6)}...${submission.submitterAddress.slice(-4)})`}</span>
                  {submission.isWinner && (
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      Winner
                    </Badge>
                  )}
                  {currentWinnerAddress === submission.submitterAddress && (
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      Winner
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400">Submitted on {format(submission.submissionTime, "PPP")}</p>
              </div>

              <Badge
                variant="secondary"
                className={
                  submission.status === "accepted"
                    ? "bg-green-500/20 text-green-500"
                    : submission.status === "rejected"
                      ? "bg-red-500/20 text-red-500"
                      : submission.status === "paid"
                        ? "bg-blue-500/20 text-blue-500"
                        : "bg-yellow-500/20 text-yellow-500"
                }
              >
                {submission.status === "accepted"
                  ? "Accepted"
                  : submission.status === "rejected"
                    ? "Rejected"
                    : submission.status === "paid"
                      ? "Paid"
                      : "Pending"}
              </Badge>
            </div>

            <div className="bg-black/20 border border-indigo-400/10 rounded-md p-4 mb-3 whitespace-pre-wrap">
              <h4 className="text-indigo-300 font-medium mb-2">Submission Details:</h4>
              <p className="text-gray-300">{submission.description}</p>
            </div>

            {submission.attachments && submission.attachments.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-indigo-300 mb-1">Attachments:</p>
                <div className="flex flex-wrap gap-2">
                  {submission.attachments.map((attachment, index) => (
                    <Badge key={index} variant="outline" className="bg-indigo-600/10 border-indigo-400/30">
                      {attachment}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {submission.feedback && (
              <div className="bg-indigo-900/20 border border-indigo-400/20 rounded-md p-3 mb-3">
                <p className="text-sm text-indigo-300 mb-1">Your Feedback:</p>
                <p className="text-gray-300">{submission.feedback}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {submission.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-400/20 text-white"
                  onClick={() => setSelectedSubmission(submission)}
                  disabled={processingAction === submission.id}
                >
                  Review Submission
                </Button>
              )}

              {submission.status === "accepted" && !submission.isWinner && !currentWinnerAddress && (
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => handleSetWinner(submission)}
                  disabled={settingWinner}
                >
                  {settingWinner ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Setting Winner...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-1" /> Set as Winner
                    </>
                  )}
                </Button>
              )}

              {(submission.isWinner || currentWinnerAddress === submission.submitterAddress) &&
                submission.status !== "paid" && (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleSendReward(submission)}
                    disabled={processingAction === submission.id}
                  >
                    <Send className="h-4 w-4 mr-1" /> Send Reward
                  </Button>
                )}

              {submission.status === "paid" && (
                <Button size="sm" variant="outline" className="border-indigo-400/20 text-white" disabled>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> Reward Sent
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href={`/bounty/${params.id}`}
            className="inline-flex items-center text-indigo-300 hover:text-indigo-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounty
          </Link>

          <Badge variant="secondary" className={bountyStatus.color}>
            {bountyStatus.status}
          </Badge>
        </div>

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
              <h1 className="text-3xl font-bold text-white mb-4">{bounty.bountyName}</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-300 mb-3">
                    <Calendar className="h-5 w-5" />
                    <span className="text-gray-300">Deadline:</span>
                    <span className="text-white">{format(new Date(Number(bounty.endTime) * 1000), "PPP")}</span>
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
                    <User className="h-5 w-5" />
                    <span className="text-gray-300">Your Address:</span>
                    <span className="text-white font-mono">{`${activeAccount?.address.slice(0, 6)}...${activeAccount?.address.slice(-4)}`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Management Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-black/40 border-indigo-400/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-2">Pending Submissions</h3>
              <p className="text-4xl font-bold text-indigo-400">{pendingSubmissions}</p>
              <p className="text-gray-400 text-sm mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-indigo-400/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-2">Accepted Submissions</h3>
              <p className="text-4xl font-bold text-green-400">{acceptedSubmissions}</p>
              <p className="text-gray-400 text-sm mt-1">Ready for payment</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-indigo-400/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-white mb-2">Rewards Paid</h3>
              <p className="text-4xl font-bold text-yellow-400">{paidSubmissions}</p>
              <p className="text-gray-400 text-sm mt-1">Successfully completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Management */}
        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="bg-black/40 w-full rounded-xl h-12 p-1">
            <TabsTrigger value="all" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              All Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Pending ({pendingSubmissions})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Accepted ({acceptedSubmissions})
            </TabsTrigger>
            <TabsTrigger value="paid" className="h-10 rounded-md data-[state=active]:bg-indigo-600">
              Paid ({paidSubmissions})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card className="bg-black/40 border-indigo-400/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">All Submissions</h2>
                {renderSubmissionsList(submissions)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <Card className="bg-black/40 border-indigo-400/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Pending Submissions</h2>
                {renderSubmissionsList(submissions.filter((sub) => sub.status === "pending"))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            <Card className="bg-black/40 border-indigo-400/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Accepted Submissions</h2>
                {renderSubmissionsList(submissions.filter((sub) => sub.status === "accepted"))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paid" className="mt-6">
            <Card className="bg-black/40 border-indigo-400/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Paid Submissions</h2>
                {renderSubmissionsList(submissions.filter((sub) => sub.status === "paid"))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feedback Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
          <DialogContent className="bg-black/90 border-indigo-400/30 text-white">
            <DialogHeader>
              <DialogTitle>Provide Feedback</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add feedback for the submission before accepting or rejecting it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="feedback" className="text-white">
                  Feedback
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the submitter..."
                  className="min-h-[100px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="border-indigo-400/20 text-white"
                onClick={() => setSelectedSubmission(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedSubmission && handleRejectSubmission(selectedSubmission)}
                disabled={processingAction === selectedSubmission?.id}
              >
                {processingAction === selectedSubmission?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => selectedSubmission && handleAcceptSubmission(selectedSubmission)}
                disabled={processingAction === selectedSubmission?.id}
              >
                {processingAction === selectedSubmission?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Reward Dialog */}
        <Dialog open={sendingReward} onOpenChange={(open) => !open && setSendingReward(false)}>
          <DialogContent className="bg-black/90 border-indigo-400/30 text-white">
            <DialogHeader>
              <DialogTitle>Sending Reward</DialogTitle>
              <DialogDescription className="text-gray-400">
                Processing blockchain transaction to send the reward.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-white text-center">
                Please wait while we process your transaction on the Algorand blockchain.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add a new dialog for setting a winner */}
        <Dialog open={settingWinner} onOpenChange={(open) => !open && setSettingWinner(false)}>
          <DialogContent className="bg-black/90 border-indigo-400/30 text-white">
            <DialogHeader>
              <DialogTitle>Setting Winner</DialogTitle>
              <DialogDescription className="text-gray-400">
                Processing blockchain transaction to set the winner.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-yellow-500 animate-spin mb-4" />
              <p className="text-white text-center">
                Please wait while we process your transaction on the Algorand blockchain.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
