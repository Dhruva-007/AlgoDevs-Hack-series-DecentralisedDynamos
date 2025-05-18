"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface PythonSidebarProps {
  activeItem?: string
}

export function PythonSidebar({ activeItem }: PythonSidebarProps) {
  const pathname = usePathname()

  const items = [
    { id: "variables", name: "Variables" },
    { id: "lists", name: "Lists" },
    { id: "dictionaries", name: "Dictionaries" },
    { id: "functions", name: "Functions" },
    { id: "imports", name: "Imports" },
    { id: "payment-transactions", name: "Payment Transactions" },
    { id: "key-registration", name: "Key Registration" },
    { id: "freeze-and-clawback", name: "Freeze and Clawback" },
    { id: "getting-started-with-algorand", name: "Getting Started with Algorand" },
    { id: "installation-and-setup", name: "Installation and Setup" },
    { id: "speed-run-variables", name: "Speed Run Variables" },
    { id: "speed-run-functions-and-classes", name: "Speed Run Functions and Classes" },
  ]

  return (
    <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 border border-indigo-400/20 sticky top-24">
      <h2 className="text-xl font-bold text-white mb-4">Python Chapters</h2>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = activeItem === item.id || pathname.includes(`/learn/python/${item.id}`)
          return (
            <Link
              key={item.id}
              href={`/learn/python/${item.id}`}
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
