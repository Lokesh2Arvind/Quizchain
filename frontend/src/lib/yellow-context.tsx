'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createGetChannelsMessage,
  parseAnyRPCResponse,
  RPCMethod,
} from '@erc7824/nitrolite'
import type { AppSession, StateUpdate, YellowState, YellowConfig } from '../types'
import { useAccount, useWalletClient } from 'wagmi'
import { Wallet, HDNodeWallet } from 'ethers'
import { Hex } from 'viem'

interface YellowContextType extends YellowState {
  connect: () => Promise<void>
  disconnect: () => void
  createSession: (session: AppSession) => Promise<string>
  updateSession: (update: StateUpdate) => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
  sendMessage: (message: any) => void
  getChannels: () => Promise<void>
  requestTestTokens: () => Promise<void>
}

const YellowContext = createContext<YellowContextType | undefined>(undefined)

// Yellow Clearnode Testnet Configuration
const yellowConfig: YellowConfig = {
  clearNodeUrl: 'wss://clearnet-sandbox.yellow.com/ws', // Testnet URL
  contractAddresses: {
    custody: process.env.NEXT_PUBLIC_CUSTODY_ADDRESS || '',
    adjudicator: process.env.NEXT_PUBLIC_ADJUDICATOR_ADDRESS || '',
    token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || ''
  },
  chainId: 11155111 // Sepolia testnet
}

export function YellowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<YellowState>({
    isConnected: false,
    sessionId: null,
    balance: '0',
    error: null
  })

  const [ws, setWs] = useState<WebSocket | null>(null)
  const [stateWallet, setStateWallet] = useState<HDNodeWallet | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingChallenge, setPendingChallenge] = useState<any>(null)
  const [authRequestParams, setAuthRequestParams] = useState<any>(null)

  const { address, isConnected: walletConnected } = useAccount()
  const { data: walletClient } = useWalletClient()  // Create state wallet (session key) for signing messages
  const createStateWallet = useCallback(() => {
    console.log('🔑 Step 1: Creating state wallet (session key)...')
    const wallet = Wallet.createRandom()
    setStateWallet(wallet)
    console.log('✅ State wallet created:', wallet.address)
    return wallet
  }, [])

  // Message signer function for non-EIP-712 messages (using ethers v6 syntax)
  const messageSigner = useCallback(async (payload: any): Promise<Hex> => {
    if (!stateWallet) {
      throw new Error('State wallet not available')
    }

    try {
      const message = JSON.stringify(payload)
      // Use ethers v6 syntax
      const messageBytes = Buffer.from(message, 'utf8')
      const signature = await stateWallet.signMessage(messageBytes)

      console.log('📝 Message signed')
      return signature as Hex
    } catch (error) {
      console.error('❌ Error signing message:', error)
      throw error
    }
  }, [stateWallet])

  // Request test tokens from faucet
  const requestTestTokens = useCallback(async () => {
    if (!address) {
      console.error('❌ No wallet address available')
      return
    }

    try {
      console.log('💰 Requesting test tokens from faucet...')
      console.log('📍 Address:', address)

      const response = await fetch('https://clearnet-sandbox.yellow.com/faucet/requestTokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address })
      })

      const data = await response.json()
      console.log('✅ Faucet response:', data)
      console.log('✅ State Channel created')
    } catch (error) {
      console.error('❌ Error requesting test tokens:', error)
    }
  }, [address])

  // Process pending challenge when all components are ready
  useEffect(() => {
    if (!pendingChallenge || !walletClient || !stateWallet || !address || !ws || !authRequestParams) {
      return
    }

    const processChallenge = async () => {
      try {
        console.log('🔐 Step 4: Creating EIP-712 signature for challenge...')
        console.log('Components ready - State wallet:', stateWallet.address, 'Address:', address)
        console.log('Auth request params:', authRequestParams)

        // Create EIP-712 message signer with the SAME parameters as auth_request
        const eip712Signer = createEIP712AuthMessageSigner(
          walletClient as any, // Type cast to fix version mismatch
          {
            scope: authRequestParams.scope,
            application: authRequestParams.application,
            participant: authRequestParams.session_key,
            expire: authRequestParams.expire,
            allowances: authRequestParams.allowances
          },
          {
            name: authRequestParams.app_name
          }
        )

        console.log('🔐 Step 5: Signing auth challenge with EIP-712...')
        console.log('🔔 MetaMask popup should appear now for signing...')
        const authVerifyMsg = await createAuthVerifyMessage(
          eip712Signer,
          pendingChallenge
        )

        console.log('🔐 Step 6: Sending auth_verify message...')
        ws.send(authVerifyMsg)
        console.log('✅ Auth verification message sent')

        // Clear the pending challenge
        setPendingChallenge(null)
      } catch (error) {
        console.error('❌ Error creating auth verification:', error)
        setState(prev => ({ ...prev, error: `Auth verification failed: ${(error as Error).message}` }))
        setPendingChallenge(null)
      }
    }

    processChallenge()
  }, [pendingChallenge, walletClient, stateWallet, address, ws, authRequestParams])

  // Handle WebSocket messages
  const handleMessage = useCallback(async (event: MessageEvent) => {
    try {
      console.log('📨 Raw message received:', event.data)

      // Try to parse the message, but catch parsing errors for unsupported message types
      let message
      try {
        message = parseAnyRPCResponse(event.data)
        console.log('📨 Parsed message:', message)
      } catch (parseError) {
        // Some messages like 'assets' might not parse correctly due to schema validation
        // This is expected and we can safely ignore these messages
        console.log('⚠️ Could not parse message (possibly an informational message like assets list), skipping')
        return
      }

      switch (message.method) {
        case RPCMethod.AuthChallenge:
          console.log('🔐 Step 3: Received auth challenge from Clearnode')
          console.log('Challenge details:', message.params)

          // Store the challenge to process it
          setPendingChallenge(message)
          break

        case RPCMethod.AuthVerify:
          console.log('🎉 Step 7: Auth verification response received')
          if (message.params?.success) {
            console.log('✅ Authentication successful!')
            if (message.params?.jwtToken) {
              console.log('🎫 JWT Token received (storing for future reconnections)')
              localStorage.setItem('clearnode_jwt', message.params.jwtToken)
            }
            setIsAuthenticated(true)
            setState(prev => ({ ...prev, isConnected: true, error: null }))

            // Request channel information after successful auth
            console.log('📡 Step 8: Requesting channel information...')
            setTimeout(() => getChannels(), 1000)
          } else {
            console.error('❌ Authentication failed:', message.params)
            setState(prev => ({ ...prev, error: 'Authentication failed', isConnected: false }))
            setIsAuthenticated(false)
          }
          break

        case RPCMethod.GetChannels:
          console.log('📋 Channel information received:')
          const channelData = message.params as { channels: any[] }
          const channels = channelData.channels || []
          if (channels && channels.length > 0) {
            channels.forEach((channel: any, index: number) => {
              console.log(`📦 Channel ${index + 1}:`)
              console.log(`  - Channel ID: ${channel.channel_id}`)
              console.log(`  - Status: ${channel.status}`)
              console.log(`  - Participant: ${channel.participant}`)
              console.log(`  - Token: ${channel.token}`)
              console.log(`  - Amount: ${channel.amount}`)
              console.log(`  - Chain ID: ${channel.chain_id}`)
              console.log(`  - Created: ${channel.created_at}`)
            })

            // Update balance from first channel
            setState(prev => ({ ...prev, balance: channels[0].amount }))
          } else {
            console.log('📭 No active channels found')
            console.log('💡 You can create a channel at https://apps.yellow.com/')
          }
          break

        case RPCMethod.Error:
          console.error('❌ Error from Clearnode:', message.params)
          setState(prev => ({ ...prev, error: message.params?.error || 'Unknown error' }))
          break

        default:
          console.log('📨 Other message type:', message.method, message.params)
          break
      }
    } catch (error) {
      console.error('❌ Error handling message:', error)
    }
  }, [walletClient, stateWallet, address, ws])

  // Get channels information
  const getChannels = useCallback(async () => {
    if (!ws || !stateWallet || !messageSigner) {
      console.error('❌ Cannot get channels: not connected or no state wallet')
      return
    }

    try {
      console.log('📡 Requesting channel information...')
      const getChannelsMsg = await createGetChannelsMessage(
        messageSigner,
        stateWallet.address as Hex
      )
      ws.send(getChannelsMsg)
    } catch (error) {
      console.error('❌ Error requesting channels:', error)
    }
  }, [ws, stateWallet, messageSigner])

  // Connect to Yellow Network Clearnode
  const connect = useCallback(async () => {
    if (state.isConnected || ws) {
      console.log('⚠️ Already connected or connecting')
      return
    }

    if (!walletConnected || !address) {
      console.error('❌ Please connect your wallet first')
      setState(prev => ({ ...prev, error: 'Please connect your wallet first' }))
      return
    }

    if (!walletClient) {
      console.error('❌ Wallet client not ready yet. Please wait a moment and try again.')
      setState(prev => ({ ...prev, error: 'Wallet client not ready. Please try again in a moment.' }))
      return
    }

    try {
      console.log('🌟 ===== STARTING YELLOW NETWORK CONNECTION =====')
      console.log('📍 Wallet Address:', address)
      console.log('🌐 Clearnode URL:', yellowConfig.clearNodeUrl)
      console.log('⛓️ Chain ID:', yellowConfig.chainId, '(Sepolia)')
      console.log('🔧 Wallet Client:', !!walletClient ? 'Available' : 'Not Available')

      setState(prev => ({ ...prev, error: null }))

      // Step 1: Create state wallet
      const wallet = createStateWallet()

      // Step 2: Connect to Clearnode WebSocket
      console.log('🔌 Step 2: Connecting to Clearnode WebSocket...')
      const websocket = new WebSocket(yellowConfig.clearNodeUrl)

      websocket.onopen = async () => {
        console.log('✅ WebSocket connection established')
        setWs(websocket)

        try {
          // Step 2.5: Send auth_request
          console.log('🔐 Step 2.5: Sending auth_request...')

          const authParams = {
            address: address,
            session_key: wallet.address as Hex,
            app_name: 'Quizchain',
            expire: (Math.floor(Date.now() / 1000) + 3600).toString(),
            scope: 'console',
            application: address, // Using wallet address as app address
            allowances: []
          }

          // Store the auth request params for later use in EIP-712 signing
          setAuthRequestParams(authParams)

          const authRequestMsg = await createAuthRequestMessage(authParams)

          console.log('📤 Sending auth_request message')
          websocket.send(authRequestMsg)
          console.log('✅ Auth request sent, waiting for challenge...')

        } catch (error) {
          console.error('❌ Error sending auth request:', error)
          setState(prev => ({ ...prev, error: `Auth request failed: ${(error as Error).message}` }))
        }
      }

      websocket.onmessage = handleMessage

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setState(prev => ({ ...prev, error: 'WebSocket connection failed', isConnected: false }))
      }

      websocket.onclose = (event) => {
        console.log(`🔌 WebSocket connection closed: ${event.code} ${event.reason}`)
        console.log('ℹ️ This is normal - game sessions are tracked on the backend')
        console.log('💡 Prize distribution continues even if Yellow disconnects during gameplay')
        setState(prev => ({ ...prev, isConnected: false }))
        setWs(null)
        setIsAuthenticated(false)
      }

    } catch (error) {
      console.error('❌ Connection error:', error)
      setState(prev => ({ ...prev, error: (error as Error).message, isConnected: false }))
    }
  }, [state.isConnected, ws, walletConnected, address, walletClient, createStateWallet, handleMessage])

  const disconnect = () => {
    console.log('👋 Disconnecting from Yellow Network...')
    if (ws) {
      ws.close()
    }
    setState({
      isConnected: false,
      sessionId: null,
      balance: '0',
      error: null
    })
    setWs(null)
    setStateWallet(null)
    setIsAuthenticated(false)
    localStorage.removeItem('clearnode_jwt')
    console.log('✅ Disconnected')
  }

  const createSession = async (session: AppSession): Promise<string> => {
    if (!ws || !messageSigner) {
      throw new Error('Not connected to Yellow Network')
    }

    try {
      console.log('🎮 Creating game session...')
      const sessionData = {
        type: 'create_session',
        session,
        timestamp: Date.now()
      }

      const signature = await messageSigner(sessionData)
      const signedMessage = { ...sessionData, signature }

      ws.send(JSON.stringify(signedMessage))

      return new Promise((resolve) => {
        setTimeout(() => {
          const sessionId = `session_${Date.now()}`
          setState(prev => ({ ...prev, sessionId }))
          console.log('✅ Session created:', sessionId)
          resolve(sessionId)
        }, 1000)
      })
    } catch (error) {
      console.error('❌ Session creation error:', error)
      throw error
    }
  }

  const updateSession = async (update: StateUpdate): Promise<void> => {
    if (!ws || !messageSigner) {
      throw new Error('Not connected to Yellow Network')
    }

    try {
      const signature = await messageSigner(update)
      const signedUpdate = { ...update, signature }
      ws.send(JSON.stringify(signedUpdate))
    } catch (error) {
      console.error('❌ Session update error:', error)
      throw error
    }
  }

  const closeSession = async (sessionId: string): Promise<void> => {
    if (!ws || !messageSigner) {
      throw new Error('Not connected to Yellow Network')
    }

    try {
      console.log('🔚 Closing session:', sessionId)
      const closeMessage = {
        type: 'close_session',
        sessionId,
        timestamp: Date.now()
      }

      const signature = await messageSigner(closeMessage)
      const signedClose = { ...closeMessage, signature }
      ws.send(JSON.stringify(signedClose))
      console.log('✅ Session closed')
    } catch (error) {
      console.error('❌ Session close error:', error)
      throw error
    }
  }

  const sendMessage = (message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      console.error('❌ Cannot send message: WebSocket not connected')
    }
  }

  const value: YellowContextType = {
    ...state,
    connect,
    disconnect,
    createSession,
    updateSession,
    closeSession,
    sendMessage,
    getChannels,
    requestTestTokens
  }

  return (
    <YellowContext.Provider value={value}>
      {children}
    </YellowContext.Provider>
  )
}

export function useYellow() {
  const context = useContext(YellowContext)
  if (context === undefined) {
    throw new Error('useYellow must be used within a YellowProvider')
  }
  return context
}
