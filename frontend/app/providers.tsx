'use client'

import React from 'react'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { 
  mainnet, 
  polygon, 
  polygonMumbai, 
  optimism, 
  arbitrum, 
  sepolia, 
  goerli, 
  base, 
  baseSepolia,
  bsc,
  avalanche,
  fantom,
  gnosis
} from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { YellowProvider } from '../src/lib/yellow-context'
import { BackendProvider } from '../src/lib/backend-context'

const { chains, publicClient } = configureChains(
  [
    mainnet, 
    polygon, 
    polygonMumbai,
    optimism, 
    arbitrum, 
    sepolia,
    goerli,
    base,
    baseSepolia,
    bsc,
    avalanche,
    fantom,
    gnosis
  ],
  [publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: 'QuizChain',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <BackendProvider>
          <YellowProvider>
            {children}
          </YellowProvider>
        </BackendProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  )
}