"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { useWallet } from "@txnlab/use-wallet-react"

// Base navigation items always visible
const baseNavigationItems = [
  { name: "Open Source", href: "/open" },
  { name: "Learn", href: "/learn" },
  { name: "ARCs", href: "/ARCs" },
  { name: "Docs", href: "/docs" },
]

// Navigation items only visible when wallet is connected
const walletRequiredItems = [
  { name: "Bounties", href: "/bounties" },
  { name: "Projects", href: "/projects" },
  // { name: "AI", href: "/chat" },
]

export function Header() {
  const pathname = usePathname()
  const { activeAccount } = useWallet()

  // Combine navigation items based on wallet connection status
  const navigationItems = activeAccount ? [...walletRequiredItems, ...baseNavigationItems] : baseNavigationItems

  return (
    <header className="fixed top-0 z-50 w-full bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="mr-2 px-0 text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-[#0c0909] border-white/20">
              <div className="flex flex-col space-y-6">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-white">AlgoDevs</span>
                </Link>
                <nav className="flex flex-col space-y-4">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group relative px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white",
                        pathname === item.href && "text-white",
                        "after:absolute after:inset-y-0 after:left-0 after:w-[2px] after:bg-white after:opacity-0 after:transition-opacity hover:after:opacity-100",
                        pathname === item.href && "after:opacity-100",
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col space-y-4 px-4">
                  <ConnectWalletButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center space-x-2 group">
            <span className="text-2xl font-bold text-white transition-all tracking-wider">AlgoDevs</span>
          </Link>
        </div>

        <nav className="hidden lg:flex lg:items-center lg:justify-center lg:space-x-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium text-white rounded-full transition-colors hover:bg-white/10",
                pathname === item.href && "bg-white/10",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center">
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  )
}

