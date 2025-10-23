'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createAppSessionMessage } from '@erc7824/nitrolite'
import type { AppSession, StateUpdate, YellowState, YellowConfig } from '../types'

interface YellowContextType extends YellowState {
  connect: () => Promise<void>
  disconnect: () => void
  createSession: (session: AppSession) => Promise<string>
  updateSession: (update: StateUpdate) => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
  sendMessage: (message: any) => void
}

const YellowContext = createContext<YellowContextType | undefined>(undefined)

const yellowConfig: YellowConfig = {
  clearNodeUrl: process.env.NEXT_PUBLIC_CLEARNODE_URL || 'wss://testnet.clearnet.yellow.com/ws',
  contractAddresses: {
    custody: process.env.NEXT_PUBLIC_CUSTODY_ADDRESS || '',
    adjudicator: process.env.NEXT_PUBLIC_ADJUDICATOR_ADDRESS || '',
    token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || ''
  },
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '80001') // Mumbai testnet
}

export function YellowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<YellowState>({
    isConnected: false,
    sessionId: null,
    balance: '0',
    error: null
  })
  
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [messageSigner, setMessageSigner] = useState<((message: string) => Promise<string>) | null>(null)

  // Setup message signer from wallet
  const setupMessageSigner = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        const signer = async (message: string) => {
          return await (window as any).ethereum.request({
            method: 'personal_sign',
            params: [message, accounts[0]]
          })
        }
        setMessageSigner(() => signer)
        return signer
      }
    }
    throw new Error('No wallet found')
  }

  const connect = async () => {
    try {
      setState(prev => ({ ...prev, error: null }))
      
      // Setup wallet signer
      await setupMessageSigner()
      
      // Connect to ClearNode
      const websocket = new WebSocket(yellowConfig.clearNodeUrl)
      
      websocket.onopen = () => {
        console.log('✅ Connected to Yellow Network')
        setState(prev => ({ ...prev, isConnected: true }))
        setWs(websocket)
      }
      
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setState(prev => ({ ...prev, error: 'Connection failed', isConnected: false }))
      }
      
      websocket.onclose = () => {
        console.log('WebSocket connection closed')
        setState(prev => ({ ...prev, isConnected: false }))
        setWs(null)
      }
      
    } catch (error) {
      console.error('Connection error:', error)
      setState(prev => ({ ...prev, error: (error as Error).message, isConnected: false }))
    }
  }

  const disconnect = () => {
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
    setMessageSigner(null)
  }

  const handleMessage = (message: any) => {
    console.log('📨 Yellow message:', message)
    
    switch (message.type) {
      case 'session_created':
        setState(prev => ({ ...prev, sessionId: message.sessionId }))
        break
      case 'session_closed':
        setState(prev => ({ ...prev, sessionId: null }))
        break
      case 'error':
        setState(prev => ({ ...prev, error: message.error }))
        break
      default:
        // Handle other message types
        break
    }
  }

  const createSession = async (session: AppSession): Promise<string> => {
    if (!ws || !messageSigner) {
      throw new Error('Not connected to Yellow Network')
    }

    try {
      // For now, we'll simulate session creation since the SDK format might need adjustment
      const sessionData = {
        type: 'create_session',
        session,
        timestamp: Date.now()
      }
      
      const signature = await messageSigner(JSON.stringify(sessionData))
      const signedMessage = { ...sessionData, signature }
      
      ws.send(JSON.stringify(signedMessage))
      
      // Return a mock session ID for now
      return new Promise((resolve) => {
        setTimeout(() => {
          const sessionId = `session_${Date.now()}`
          setState(prev => ({ ...prev, sessionId }))
          resolve(sessionId)
        }, 1000)
      })
    } catch (error) {
      console.error('Session creation error:', error)
      throw error
    }
  }

  const updateSession = async (update: StateUpdate): Promise<void> => {
    if (!ws || !messageSigner) {
      throw new Error('Not connected to Yellow Network')
    }

    try {
      const signature = await messageSigner(JSON.stringify(update))
      const signedUpdate = { ...update, signature }
      ws.send(JSON.stringify(signedUpdate))
    } catch (error) {
      console.error('Session update error:', error)
      throw error
    }
  }

  const closeSession = async (sessionId: string): Promise<void> => {
    if (!ws || !messageSigner) {
      throw new Error('Not connected to Yellow Network')
    }

    try {
      const closeMessage = {
        type: 'close_session',
        sessionId,
        timestamp: Date.now()
      }
      
      const signature = await messageSigner(JSON.stringify(closeMessage))
      const signedClose = { ...closeMessage, signature }
      ws.send(JSON.stringify(signedClose))
    } catch (error) {
      console.error('Session close error:', error)
      throw error
    }
  }

  const sendMessage = (message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  const value: YellowContextType = {
    ...state,
    connect,
    disconnect,
    createSession,
    updateSession,
    closeSession,
    sendMessage
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