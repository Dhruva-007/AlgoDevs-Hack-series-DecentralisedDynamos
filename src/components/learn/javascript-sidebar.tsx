"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface JavaScriptSidebarProps {
  activeItem?: string
}

export function JavaScriptSidebar({ activeItem }: JavaScriptSidebarProps) {
  const pathname = usePathname()

  const items = [
    { id: "variables", name: "Variables" },
    { id: "data-types", name: "Data Types" },
    { id: "functions", name: "Functions" },
    { id: "objects", name: "Objects" },
    { id: "arrays", name: "Arrays" },
    { id: "dom-manipulation", name: "DOM Manipulation" },
    { id: "events", name: "Events" },
    { id: "async-javascript", name: "Async JavaScript" },
    { id: "algorand-sdk", name: "Algorand SDK" },
    { id: "web3-integration", name: "Web3 Integration" },
  ]

  return (
    <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 border border-indigo-400/20 sticky top-24">
      <h2 className="text-xl font-bold text-white mb-4">JavaScript Chapters</h2>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = activeItem === item.id || pathname.includes(`/learn/javascript/${item.id}`)
          return (
            <Link
              key={item.id}
              href={`/learn/javascript/${item.id}`}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm transition-colors",
                isActive ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-indigo-600/20",
              )}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
