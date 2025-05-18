import { createClient } from "@supabase/supabase-js"

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate that we have the required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  )
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl || "https://your-project-url.supabase.co",
  supabaseAnonKey || "your-anon-key",
)
