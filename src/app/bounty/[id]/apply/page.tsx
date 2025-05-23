"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useWallet } from "@txnlab/use-wallet-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import algosdk from "algosdk"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"

export default function ApplyToBountyPage({ params }: { params: { id: string } }) {
  const { activeAccount } = useWallet()
  const { activeAccount, transactionSigner } = useWallet()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    proposal: "",
    timeline: "",
    experience: "",
    attachments: [] as File[],
  })
  const [submission, setSubmission] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeAccount) {
      alert("Please connect your wallet to apply for this bounty")
      toast.error("Please connect your wallet to apply for this bounty")
      return
    }

    if (!formData.proposal || !formData.timeline) {
      alert("Please fill in all required fields")
    if (!submission.trim()) {
      toast.error("Please provide submission details")
      return
    }

    setLoading(true)

    try {
      // In a real implementation, you would:
      // 1. Upload any attachments to IPFS or another storage solution
      // 2. Call the smart contract to submit your application
      // 3. Handle the transaction signing and confirmation

      // For now, we'll just simulate a delay and redirect
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Redirect to the bounty page with a success message
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
      alert("Failed to submit application. Please try again.")
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
            Submit your proposal for this bounty. Be specific about your approach, timeline, and relevant experience.
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
              <Label htmlFor="proposal" className="text-white">
                Your Proposal <span className="text-red-500">*</span>
              <Label htmlFor="submission" className="text-white">
                Your Submission <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="proposal"
                value={formData.proposal}
                onChange={(e) => setFormData({ ...formData, proposal: e.target.value })}
                placeholder="Describe how you would approach this bounty..."
                className="min-h-[150px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="timeline" className="text-white">
                Estimated Timeline <span className="text-red-500">*</span>
              </Label>
              <Input
                id="timeline"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                placeholder="e.g., 2 weeks"
                className="bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                id="submission"
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                placeholder="Include your GitHub repo, video links, approach description, timeline, and contact information..."
                className="min-h-[250px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="experience" className="text-white">
                Relevant Experience
              </Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="Describe your relevant experience and skills..."
                className="min-h-[100px] bg-black/30 border-indigo-400/20 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="attachments" className="text-white">
                Attachments
              </Label>
              <div className="flex items-center justify-center border-2 border-dashed border-indigo-400/30 rounded-lg p-6 bg-black/20">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300 mb-2">Drag and drop files, or click to browse</p>
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setFormData({
                          ...formData,
                          attachments: Array.from(e.target.files),
                        })
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("attachments")?.click()}
                    className="border-indigo-400/30 text-indigo-300 hover:text-indigo-200"
                  >
                    Browse Files
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">
                    Max file size: 10MB. Supported formats: PDF, ZIP, PNG, JPG
                  </p>
                </div>
              </div>
              {formData.attachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-indigo-300">{formData.attachments.length} file(s) selected</p>
                  <ul className="text-xs text-gray-400 mt-1">
                    {Array.from(formData.attachments).map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
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