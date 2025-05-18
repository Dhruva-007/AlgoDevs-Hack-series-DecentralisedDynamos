"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface GoSidebarProps {
  activeItem?: string
}

export function GoSidebar({ activeItem }: GoSidebarProps) {
  const pathname = usePathname()

  const items = [
    { id: "variables", name: "Variables" },
    { id: "data-types", name: "Data Types" },
    { id: "functions", name: "Functions" },
    { id: "structs", name: "Structs" },
    { id: "interfaces", name: "Interfaces" },
    { id: "concurrency", name: "Concurrency" },
    { id: "error-handling", name: "Error Handling" },
    { id: "packages", name: "Packages" },
    { id: "algorand-sdk", name: "Algorand SDK" },
    { id: "smart-contracts", name: "Smart Contracts" },
  ]

  return (
    <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 border border-indigo-400/20 sticky top-24">
      <h2 className="text-xl font-bold text-white mb-4">Go Chapters</h2>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = activeItem === item.id || pathname.includes(`/learn/go/${item.id}`)
          return (
            <Link
              key={item.id}
              href={`/learn/go/${item.id}`}
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
