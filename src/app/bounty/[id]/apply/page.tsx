import { supabase } from "@/lib/supabase"

// Define the correct type for params in Next.js 15
interface PageParams {
  params: Promise<{ id: string }>
}

export default async function ApplyToBountyPage({ params }: PageParams) {
  // Get the bounty ID from the route params
  const { id } = await params

  // Fetch the bounty data from Supabas
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
      <h1 className="text-2xl font-bold mb-4">Apply to Bounty</h1>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{bounty?.title || "Loading..."}</h2>
        <p className="text-gray-600">{bounty?.description || "No description available"}</p>
      </div>

      <form className="space-y-4">
        <div>
          <label htmlFor="proposal" className="block text-sm font-medium mb-1">
            Your Proposal
          </label>
          <textarea
            id="proposal"
            className="w-full p-2 border rounded-md"
            rows={6}
            placeholder="Describe how you would approach this bounty..."
          />
        </div>

        <div>
          <label htmlFor="timeline" className="block text-sm font-medium mb-1">
            Estimated Timeline
          </label>
          <input type="text" id="timeline" className="w-full p-2 border rounded-md" placeholder="e.g., 2 weeks" />
        </div>

        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Submit Application
        </button>
      </form>
    </div>
  )
}
