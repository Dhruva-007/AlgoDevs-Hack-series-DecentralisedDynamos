"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [activeLanguage, setActiveLanguage] = useState<string>("python")

  useEffect(() => {
    if (pathname.includes("/learn/python")) {
      setActiveLanguage("python")
    } else if (pathname.includes("/learn/javascript")) {
      setActiveLanguage("javascript")
    } else if (pathname.includes("/learn/go")) {
      setActiveLanguage("go")
    }
  }, [pathname])

  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Language Selector */}
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 border border-indigo-400/20 mb-8">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/learn/python"
              className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                activeLanguage === "python" ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-indigo-600/20",
              )}
            >
              Python
            </Link>
            <Link
              href="/learn/javascript"
              className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                activeLanguage === "javascript" ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-indigo-600/20",
              )}
            >
              JavaScript
            </Link>
            <Link
              href="/learn/go"
              className={cn(
                "px-4 py-2 rounded-lg transition-colors",
                activeLanguage === "go" ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-indigo-600/20",
              )}
            >
              Go
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div>{children}</div>
      </div>
    </main>
  )
}
