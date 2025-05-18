import { Header } from "@/components/header"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react" // Added import for React
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AlgoDevs - Algorand Developer Community",
  description: "Join the future of blockchain development with Algorand",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <Providers>
      <body className={inter.className}>
        <Header />
        {children}
        </body>
        </Providers>
    </html>
  )
}