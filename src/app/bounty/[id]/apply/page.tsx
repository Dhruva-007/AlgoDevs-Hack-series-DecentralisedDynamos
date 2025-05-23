"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import algosdk from "algosdk"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"

export default function ApplyToBountyPage({ params }: { params: { id: string } }) {
  const { activeAccount, transactionSigner } = useWallet()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submission, setSubmission] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeAccount) {
      toast.error("Please connect your wallet to apply for this bounty")
      return
    }

    if (!submission.trim()) {
      toast.error("Please provide submission details")
      return
    }

    setLoading(true)

    try {
      // Initialize Algorand client
      const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "")

      // Get suggested params
      const suggestedParams = await algodClient.getTransactionParams().do()

      // Get active address
      const activeAddress = activeAccount.address

      // Get app ID from params
      const appID = params.id

      toast.info("Submitting your application to the blockchain...", { autoClose: false })

      // Create the transaction
      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: Number(appID),
        appArgs: [
          algosdk
            .getMethodByName(
              [
                new algosdk.ABIMethod({
                  name: "applyBounty",
                  desc: "",
                  args: [{ type: "string", name: "submission", desc: "" }],
                  returns: { type: "void", desc: "" },
                }),
              ],
              "applyBounty",
            )
            .getSelector(),
          new algosdk.ABIStringType().encode(submission),
        ],
        suggestedParams: { ...suggestedParams },
        boxes: [{ appIndex: 0, name: algosdk.decodeAddress(activeAddress).publicKey }],
      })

      const txns = [txn]

      // Sign the transaction
      const signedTxns = await transactionSigner(txns, [0])

      // Send the transaction
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do()

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txid, 4)

      toast.success("Application submitted successfully!")

      // Redirect to the bounty page
      router.push(`/bounty/${params.id}?success=true`)
    } catch (error) {
      console.error("Error submitting application:", error)
      toast.error("Failed to submit application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <Link
          href={`/bounty/${params.id}`}
          className="inline-flex items-center text-indigo-300 hover:text-indigo-200 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bounty
        </Link>

        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-8 border border-indigo-400/20">
          <h1 className="text-3xl font-bold text-white mb-6">Apply for Bounty</h1>
          <p className="text-gray-400 mb-8">
            Submit your proposal for this bounty. Be specific about your approach and include all relevant information.
          </p>

          <Card className="bg-black/30 border-indigo-400/30 p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Submission Guidelines</h3>
            <p className="text-gray-300 mb-3">Please include the following information in your submission:</p>
            <ul className="list-disc pl-5 text-gray-300 space-y-1">
              <li>GitHub repository link or other code hosting platform</li>
              <li>Demo video link (if applicable)</li>
              <li>Brief description of your approach</li>
              <li>Estimated timeline for completion</li>
              <li>Your relevant experience</li>
              <li>Contact information (email, Discord, etc.)</li>
            </ul>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="submission" className="text-white">
                Your Submission <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="submission"
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                placeholder="Include your GitHub repo, video links, approach description, timeline, and contact information..."
                className="min-h-[250px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link href={`/bounty/${params.id}`}>
                <Button variant="outline" className="border-indigo-400/20 text-white">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading || !activeAccount}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
