import { supabase } from "@/lib/supabase"
import Link from "next/link"

// Define the correct type for params in Next.js 15
interface PageParams {
  params: Promise<{ id: string }>
}

export default async function BountyPage({ params }: PageParams) {
  // Get the bounty ID from the route params
  const { id } = await params

  // Fetch the bounty data from Supabase
  const { data: bounty, error } = await supabase.from("bounties").select("*").eq("id", id).single()

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p>Failed to load bounty: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Bounty Details</h1>
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">{bounty?.title || "Loading..."}</h2>
        <p className="text-gray-600 mb-4">{bounty?.description || "No description available"}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Reward</p>
            <p className="font-medium">${bounty?.reward || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">{bounty?.status || "Unknown"}</p>
          </div>
        </div>

        <Link
          href={`/bounty/${id}/apply`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Apply for this Bounty
        </Link>
      </div>
    </div>
  )
}
