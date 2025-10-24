'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAccount } from 'wagmi'

interface RoomConfig {
  entryFee: number
  asset: 'USDC' | 'USDT' | 'DAI' | 'USDC.e' | 'WETH' | 'WBTC'
  maxPlayers: number
  topic: string
  password?: string
  isPublic: boolean
}

interface BackendContextType {
  socket: Socket | null
  isConnected: boolean
  currentRoomId: string | null
  error: string | null
  // Room methods
  createRoom: (config: RoomConfig) => Promise<{ success: boolean; roomId?: string; roomCode?: string; room?: any; error?: string }>
  joinRoom: (roomCode: string, password?: string) => Promise<{ success: boolean; room?: any; error?: string }>
  leaveRoom: () => Promise<{ success: boolean; error?: string }>
  listRooms: () => Promise<{ success: boolean; rooms?: any[]; error?: string }>
  getCurrentRoom: () => Promise<{ success: boolean; room?: any; error?: string }>
  startGame: () => Promise<{ success: boolean; error?: string }>
}

const BackendContext = createContext<BackendContextType | undefined>(undefined)

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

export function BackendProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { address, isConnected: walletConnected } = useAccount()

  useEffect(() => {
    // Only connect to backend when wallet is connected
    if (!walletConnected || !address) return

    console.log('🔌 Connecting to backend:', BACKEND_URL)
    
    const socketInstance = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketInstance.on('connect', () => {
      console.log('✅ Connected to backend server')
      setIsConnected(true)
      setError(null)
      
      // Register user with backend
      socketInstance.emit('user:connect', {
        walletAddress: address,
        username: `User_${address.slice(0, 6)}`
      })
    })

    socketInstance.on('user:connected', (data) => {
      console.log('👤 User registered:', data)
    })

    socketInstance.on('connect_error', (err) => {
      console.error('❌ Connection error:', err.message)
      setError('Failed to connect to backend')
      setIsConnected(false)
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason)
      setIsConnected(false)
    })

    socketInstance.on('error', (data) => {
      console.error('⚠️ Backend error:', data)
      setError(data.message)
    })

    // Room event listeners
    socketInstance.on('room:playerJoined', (data) => {
      console.log('👥 Player joined room:', data)
      // Trigger a refresh of room list or current room
    })

    socketInstance.on('room:playerLeft', (data) => {
      console.log('👋 Player left room:', data)
    })

    socketInstance.on('room:closed', (data) => {
      console.log('🚪 Room closed:', data.reason)
      setCurrentRoomId(null)
      alert(`Room closed: ${data.reason}`)
    })

    socketInstance.on('room:gameStarting', (data) => {
      console.log('🎮 Game starting:', data)
    })

    // Broadcast when new room is created (for other users to see)
    socketInstance.on('room:created', (data) => {
      console.log('🆕 New room created:', data)
    })

    // Game event listeners
    socketInstance.on('game:ready', (data) => {
      console.log('🎮 Game ready:', data)
    })

    socketInstance.on('game:question', (data) => {
      console.log('❓ New question:', data)
    })

    socketInstance.on('game:ended', (data) => {
      console.log('🏁 Game ended:', data)
    })

    socketInstance.on('game:error', (data) => {
      console.error('⚠️ Game error:', data)
      alert(`Game Error: ${data.message}`)
    })

    socketRef.current = socketInstance

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up socket connection')
      socketInstance.disconnect()
    }
  }, [address, walletConnected])

  // Room management methods
  const createRoom = useCallback(async (config: RoomConfig) => {
    if (!socketRef.current || !isConnected) {
      return { success: false, error: 'Not connected to backend' }
    }

    return new Promise<{ success: boolean; roomId?: string; roomCode?: string; room?: any; error?: string }>((resolve) => {
      socketRef.current?.emit('room:create', 
        { hostData: {}, roomConfig: config },
        (response: any) => {
          if (response.success) {
            setCurrentRoomId(response.roomId)
          }
          resolve(response)
        }
      )
    })
  }, [isConnected])

  const joinRoom = useCallback(async (roomCode: string, password?: string) => {
    if (!socketRef.current || !isConnected) {
      return { success: false, error: 'Not connected to backend' }
    }

    return new Promise<{ success: boolean; room?: any; error?: string }>((resolve) => {
      socketRef.current?.emit('room:join', 
        { roomCode, password },
        (response: any) => {
          if (response.success) {
            setCurrentRoomId(response.room.id)
          }
          resolve(response)
        }
      )
    })
  }, [isConnected])

  const leaveRoom = useCallback(async () => {
    if (!socketRef.current || !isConnected) {
      return { success: false, error: 'Not connected to backend' }
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current?.emit('room:leave', (response: any) => {
        if (response.success) {
          setCurrentRoomId(null)
        }
        resolve(response)
      })
    })
  }, [isConnected])

  const listRooms = useCallback(async () => {
    if (!socketRef.current || !isConnected) {
      return { success: false, error: 'Not connected to backend' }
    }

    return new Promise<{ success: boolean; rooms?: any[]; error?: string }>((resolve) => {
      socketRef.current?.emit('room:list', (response: any) => {
        resolve(response)
      })
    })
  }, [isConnected])

  const getCurrentRoom = useCallback(async () => {
    if (!socketRef.current || !isConnected) {
      return { success: false, error: 'Not connected to backend' }
    }

    return new Promise<{ success: boolean; room?: any; error?: string }>((resolve) => {
      socketRef.current?.emit('room:get', (response: any) => {
        resolve(response)
      })
    })
  }, [isConnected])

  const startGame = useCallback(async () => {
    if (!socketRef.current || !isConnected) {
      return { success: false, error: 'Not connected to backend' }
    }

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current?.emit('room:startGame', (response: any) => {
        resolve(response)
      })
    })
  }, [isConnected])

  const value = {
    socket: socketRef.current,
    isConnected,
    currentRoomId,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    listRooms,
    getCurrentRoom,
    startGame
  }

  return (
    <BackendContext.Provider value={value}>
      {children}
    </BackendContext.Provider>
  )
}

export function useBackend() {
  const context = useContext(BackendContext)
  if (context === undefined) {
    throw new Error('useBackend must be used within BackendProvider')
  }
  return context
}
