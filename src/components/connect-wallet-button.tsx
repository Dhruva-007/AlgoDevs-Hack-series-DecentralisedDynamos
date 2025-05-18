"use client"

import { useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { Button } from "@/components/ui/button"
import ConnectWalletModal from "./connect-wallet-modal"

export function ConnectWalletButton() {
  const { activeAccount, wallets } = useWallet()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <>
      <Button onClick={openModal} className="bg-white hover:bg-white/90 text-black">
        {activeAccount ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}` : "Connect Wallet"}
      </Button>

      <ConnectWalletModal wallets={wallets} isOpen={isModalOpen} onClose={closeModal} />
    </>
  )
}

