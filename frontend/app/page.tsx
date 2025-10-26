'use client'

import { useState, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useYellow } from '@/lib/yellow-context'
import { useBackend } from '@/lib/backend-context'
import QuizGame from '@/components/QuizGame'
import { QuizResults } from '@/components/QuizResults'
import type { Quiz, GameState } from '@/types'

type QuizCategoryId =
  | 'Random'
  | 'All'
  | 'Age'
  | 'MixtureAndAlligation'
  | 'ProfitAndLoss'
  | 'SpeedTimeDistance'
  | 'PipesAndCisterns'
  | 'SimpleInterest'
  | 'Calendars'
  | 'PermutationAndCombination'

const QUIZ_CATEGORIES: Array<{
  id: QuizCategoryId
  title: string
  icon: string
  description: string
  accent: string
  difficulty: string
  averagePot: string
  segments: Array<'speed' | 'strategy' | 'finance'>
}> = [
  {
    id: 'Random',
    title: 'Random Mix',
    icon: '🎲',
    description: 'Chaotic blend spanning every QuizChain domain.',
    accent: 'from-fuchsia-500/30 via-purple-500/20 to-cyan-500/30',
    difficulty: 'Dynamic',
    averagePot: 'Avg stake 2.4 USDC',
    segments: ['speed', 'strategy']
  },
  {
    id: 'All',
    title: 'All Topics Arena',
    icon: '📚',
    description: 'Endurance format cycling across the entire syllabus.',
    accent: 'from-amber-400/25 via-yellow-500/15 to-orange-500/20',
    difficulty: 'Marathon',
    averagePot: 'Leaderboard tier',
    segments: ['strategy', 'finance']
  },
  {
    id: 'Age',
    title: 'Age Problems',
    icon: '⏳',
    description: 'Timeline twists and generational riddles.',
    accent: 'from-sky-400/30 via-blue-500/20 to-indigo-500/20',
    difficulty: 'Tactical',
    averagePot: 'Avg stake 1.8 USDC',
    segments: ['strategy']
  },
  {
    id: 'MixtureAndAlligation',
    title: 'Mixture & Alligation',
    icon: '🧪',
    description: 'Lab-style balancing acts with precision ratios.',
    accent: 'from-emerald-400/25 via-teal-500/20 to-cyan-500/25',
    difficulty: 'Analytical',
    averagePot: 'Avg stake 2.1 USDC',
    segments: ['strategy']
  },
  {
    id: 'ProfitAndLoss',
    title: 'Profit & Loss',
    icon: '📈',
    description: 'Marketplace duels where margins decide the victor.',
    accent: 'from-rose-400/25 via-red-500/20 to-orange-500/25',
    difficulty: 'Aggro',
    averagePot: 'Avg stake 3.0 USDC',
    segments: ['finance']
  },
  {
    id: 'SpeedTimeDistance',
    title: 'Speed · Time · Distance',
    icon: '🚀',
    description: 'Velocity chases and pursuit showdowns.',
    accent: 'from-indigo-400/25 via-blue-500/20 to-purple-500/25',
    difficulty: 'Reflex',
    averagePot: 'Avg stake 2.6 USDC',
    segments: ['speed']
  },
  {
    id: 'PipesAndCisterns',
    title: 'Pipes & Cisterns',
    icon: '🚰',
    description: 'Fluid dynamics puzzles with collaborative flow.',
    accent: 'from-cyan-400/25 via-blue-500/20 to-emerald-500/20',
    difficulty: 'Puzzle',
    averagePot: 'Avg stake 2.0 USDC',
    segments: ['strategy']
  },
  {
    id: 'SimpleInterest',
    title: 'Simple Interest',
    icon: '💵',
    description: 'Finance warm-ups with lightning-fast calculations.',
    accent: 'from-lime-400/25 via-emerald-400/20 to-teal-500/20',
    difficulty: 'Casual',
    averagePot: 'Avg stake 1.5 USDC',
    segments: ['finance']
  },
  {
    id: 'Calendars',
    title: 'Calendars & Cycles',
    icon: '📅',
    description: 'Chrono-mastery challenges across timelines.',
    accent: 'from-purple-400/25 via-indigo-500/20 to-sky-500/20',
    difficulty: 'Pattern',
    averagePot: 'Avg stake 1.9 USDC',
    segments: ['strategy']
  },
  {
    id: 'PermutationAndCombination',
    title: 'Permutation & Combination',
    icon: '🔢',
    description: 'Combinatorial mind games with factorial fireworks.',
    accent: 'from-orange-400/25 via-amber-500/15 to-pink-500/20',
    difficulty: 'Brain burn',
    averagePot: 'Avg stake 2.8 USDC',
    segments: ['strategy']
  }
]

const FLOATING_BADGES: Array<{
  label: string
  icon: string
  accent: string
  baseX: string
  baseY: string
  parallax: number
  translateX: string
  translateY: string
}> = [
  {
    label: 'MetaMask Flux',
    icon: '🦊',
    accent: 'from-orange-500/60 via-amber-400/40 to-yellow-500/20',
    baseX: '32px',
    baseY: '-40px',
    parallax: 0.12,
    translateX: '0%',
    translateY: '0%'
  },
  {
    label: 'Ledger Sync',
    icon: '🛡️',
    accent: 'from-slate-500/60 via-blue-500/45 to-cyan-500/20',
    baseX: 'calc(100% - 32px)',
    baseY: '-36px',
    parallax: 0.08,
    translateX: '-100%',
    translateY: '0%'
  },
  {
    label: 'WalletConnect',
    icon: '🔗',
    accent: 'from-indigo-500/60 via-purple-500/40 to-fuchsia-500/20',
    baseX: '48px',
    baseY: 'calc(100% + 28px)',
    parallax: 0.1,
    translateX: '0%',
    translateY: '0%'
  },
  {
    label: 'RainbowKit',
    icon: '🌈',
    accent: 'from-sky-500/60 via-cyan-500/40 to-emerald-500/20',
    baseX: 'calc(100% - 40px)',
    baseY: 'calc(100% + 32px)',
    parallax: 0.09,
    translateX: '-100%',
    translateY: '0%'
  }
]

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Modes' },
  { id: 'speed', label: 'Speed Play' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'finance', label: 'Finance' }
] as const

type CategoryFilterId = (typeof CATEGORY_FILTERS)[number]['id']

export default function Home() {
  const { address, isConnected } = useAccount()
  const { isConnected: yellowConnected, connect: connectYellow, error: yellowError, requestTestTokens } = useYellow()
  const { 
    socket, 
    isConnected: backendConnected, 
    currentRoomId,
    createRoom,
    joinRoom,
    leaveRoom,
    listRooms,
    getCurrentRoom,
    startGame
  } = useBackend()
  const [mounted, setMounted] = useState(false)
  
  const [gameState, setGameState] = useState<GameState>({
    currentQuiz: null,
    currentQuestion: null,
    questionIndex: 0,
    timeRemaining: 0,
    userAnswers: [],
    score: 0,
    isGameActive: false
  })
  
  const [currentView, setCurrentView] = useState<'lobby' | 'game' | 'results'>('lobby')

  // Room creation/joining state
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showJoinRoom, setShowJoinRoom] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [currentRoom, setCurrentRoom] = useState<any>(null)
  const [availableRooms, setAvailableRooms] = useState<any[]>([])
  const [categoryPointer, setCategoryPointer] = useState({ x: 50, y: 50, offsetX: 0, offsetY: 0 })
  const [isPointerActive, setIsPointerActive] = useState(false)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CategoryFilterId>('all')
  const categoryGridRef = useRef<HTMLDivElement | null>(null)

  // Room creation form
  const [roomConfig, setRoomConfig] = useState({
    entryFee: 1,
    asset: 'USDC' as 'USDC' | 'USDT' | 'DAI' | 'USDC.e' | 'WETH' | 'WBTC',
    maxPlayers: 5,
    topic: 'Age',
    password: '',
    isPublic: true
  })

  // Loading states
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)

  // Fix hydration by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset local room state when backend context reports no active room
  useEffect(() => {
    if (!currentRoomId) {
      setCurrentRoom(null)
      setCurrentView('lobby')
    }
  }, [currentRoomId])

  // Auto-load rooms when connected to backend
  useEffect(() => {
    if (backendConnected && !currentRoom) {
      loadRooms()
    }
  }, [backendConnected])

  // Auto-refresh rooms every 10 seconds
  useEffect(() => {
    if (!backendConnected || currentRoom) return

    const interval = setInterval(() => {
      loadRooms()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [backendConnected, currentRoom])

  // Listen for room updates (player joined/left)
  useEffect(() => {
    if (!socket || !currentRoom) return

    const handlePlayerJoined = (data: any) => {
      console.log('👥 Player joined, updating room:', data)
      console.log('📊 New participant count:', data.room.currentPlayers)
      // Update current room with new data
      setCurrentRoom(data.room)
    }

    const handlePlayerLeft = (data: any) => {
      console.log('👋 Player left, updating room:', data)
      console.log('📊 New participant count:', data.room.currentPlayers)
      // Update current room with new data
      setCurrentRoom(data.room)
    }

    const handleRoomStatusUpdate = (data: any) => {
      console.log('🔄 Room status updated:', data.room.status)
      // Update current room status
      setCurrentRoom(data.room)
    }

    const handleGameStarting = (data: any) => {
      console.log('🎮 Game starting, updating room...', data)
      // Update room to trigger QuizGame mounting with loading state
      if (data.room) {
        setCurrentRoom(data.room)
      }
    }

    socket.on('room:playerJoined', handlePlayerJoined)
    socket.on('room:playerLeft', handlePlayerLeft)
    socket.on('room:statusUpdate', handleRoomStatusUpdate)
    socket.on('room:gameStarting', handleGameStarting)

    return () => {
      socket.off('room:playerJoined', handlePlayerJoined)
      socket.off('room:playerLeft', handlePlayerLeft)
      socket.off('room:statusUpdate', handleRoomStatusUpdate)
      socket.off('room:gameStarting', handleGameStarting)
    }
  }, [socket, currentRoom])

  // Removed auto-connect to Yellow - will connect when game starts

  // Handle room creation
  const handleCreateRoom = async () => {
    if (!backendConnected) {
      alert('Please wait for backend connection')
      return
    }

    setIsCreatingRoom(true)
    try {
      const result = await createRoom(roomConfig)
      if (result.success) {
        console.log('✅ Room created:', result)
        setShowCreateRoom(false)
        setCurrentRoom(result.room)
        // Show success message with room code
        alert(`🎉 Room created successfully!\n\nRoom Code: ${result.roomCode}\n\nShare this code with other players to join!`)
      } else {
        alert(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Failed to create room. Please try again.')
    } finally {
      setIsCreatingRoom(false)
    }
  }

  // Handle room joining
  const handleJoinRoom = async (code?: string, pwd?: string) => {
    if (!backendConnected) {
      alert('Please wait for backend connection')
      return
    }

    const codeToUse = code || roomCode
    if (!codeToUse.trim()) {
      alert('Please enter a room code')
      return
    }

    setIsJoiningRoom(true)
    try {
      const result = await joinRoom(codeToUse, pwd || roomPassword || undefined)
      if (result.success) {
        console.log('✅ Joined room:', result)
        setShowJoinRoom(false)
        setRoomCode('')
        setRoomPassword('')
        setCurrentRoom(result.room)
        alert('✅ Joined room successfully!')
      } else {
        alert(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error joining room:', error)
      alert('Failed to join room. Please try again.')
    } finally {
      setIsJoiningRoom(false)
    }
  }

  // Quick join from available rooms list
  const handleQuickJoin = async (room: any) => {
    if (room.config.hasPassword) {
      const password = prompt(`🔒 This room is private. Enter password:`)
      if (password === null) return // User cancelled
      await handleJoinRoom(room.code, password)
    } else {
      await handleJoinRoom(room.code, undefined)
    }
  }

  // Handle leave room
  const handleLeaveRoom = async () => {
    const result = await leaveRoom()
    if (result.success) {
      setCurrentRoom(null)
    }
  }

  // Handle start game (for rooms)
  const handleStartGameRoom = async () => {
    const result = await startGame()
    if (result.success) {
      alert('Game starting...')
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  // Load available rooms
  const loadRooms = async () => {
    if (!backendConnected) {
      return
    }

    setIsLoadingRooms(true)
    try {
      const result = await listRooms()
      if (result.success && result.rooms) {
        setAvailableRooms(result.rooms)
        console.log('📋 Loaded rooms:', result.rooms)
      }
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setIsLoadingRooms(false)
    }
  }
  
  const handleJoinQuiz = async (quiz: Quiz) => {
    setGameState(prev => ({ 
      ...prev, 
      currentQuiz: quiz,
      currentQuestion: quiz.questions[0],
      questionIndex: 0,
  timeRemaining: quiz.questions[0]?.timeLimit || 10,
      userAnswers: [],
      score: 0,
      isGameActive: false
    }))
    setCurrentView('game')
  }

  const handleCategoryPointer = (event: MouseEvent<HTMLDivElement>) => {
    if (!categoryGridRef.current) return
    const rect = categoryGridRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setIsPointerActive(true)
    setCategoryPointer({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      offsetX: event.clientX - (rect.left + rect.width / 2),
      offsetY: event.clientY - (rect.top + rect.height / 2)
    })
  }

  const handleCategoryLeave = () => {
    setCategoryPointer({ x: 50, y: 50, offsetX: 0, offsetY: 0 })
    setIsPointerActive(false)
  }

  const handleSelectCategory = (topic: QuizCategoryId) => {
    setRoomConfig((prev) => ({ ...prev, topic }))
    setShowCreateRoom(true)
    setShowJoinRoom(false)
  }

  const filteredCategories =
    activeCategoryFilter === 'all'
      ? QUIZ_CATEGORIES
      : QUIZ_CATEGORIES.filter((category) => category.segments.includes(activeCategoryFilter))

  const activeFilterLabel = CATEGORY_FILTERS.find((option) => option.id === activeCategoryFilter)?.label ?? 'All Modes'


  const handleStartGame = () => {
    if (gameState.currentQuiz && gameState.currentQuestion) {
      setGameState(prev => ({ 
        ...prev, 
        isGameActive: true,
  timeRemaining: prev.currentQuestion?.timeLimit || 10
      }))
    }
  }

  const handleAnswerSubmit = (answerIndex: number) => {
    const currentQuestion = gameState.currentQuestion
    if (!currentQuestion || !gameState.currentQuiz) return

    const isCorrect = answerIndex === currentQuestion.correctAnswer
    const newAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex,
      timeSpent: currentQuestion.timeLimit - gameState.timeRemaining,
      isCorrect
    }

    const newAnswers = [...gameState.userAnswers, newAnswer]
    const newScore = gameState.score + (isCorrect ? 1 : 0)
    
    // Move to next question or finish quiz
    const nextIndex = gameState.questionIndex + 1
    if (nextIndex < gameState.currentQuiz.questions.length) {
      const nextQuestion = gameState.currentQuiz.questions[nextIndex]
      setGameState(prev => ({
        ...prev,
        userAnswers: newAnswers,
        score: newScore,
        questionIndex: nextIndex,
        currentQuestion: nextQuestion,
        timeRemaining: nextQuestion.timeLimit
      }))
    } else {
      // Quiz finished
      setGameState(prev => ({
        ...prev,
        userAnswers: newAnswers,
        score: newScore,
        isGameActive: false
      }))
      setCurrentView('results')
    }
  }

  const handleTimeUp = () => {
    // Auto-submit with no answer selected
    handleAnswerSubmit(-1)
  }

  const handleBackToLobby = () => {
    setGameState({
      currentQuiz: null,
      currentQuestion: null,
      questionIndex: 0,
      timeRemaining: 0,
      userAnswers: [],
      score: 0,
      isGameActive: false
    })
    setCurrentView('lobby')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030014] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 -right-36 h-96 w-96 rounded-full bg-purple-500/50 blur-3xl" />
        <div className="absolute top-1/3 -left-36 h-[28rem] w-[28rem] rounded-full bg-cyan-500/40 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-1/4 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08)_0,rgba(3,0,20,0.94)_60%)]" />
      </div>

      <div className="relative z-10 px-4 pb-20 sm:px-6 lg:px-12">
        <header className="max-w-6xl mx-auto pt-12 mb-10">
          <div className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_-60px_rgba(99,102,241,0.5)] backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                <span className="inline-flex h-[6px] w-[6px] rounded-full bg-cyan-400" />
                <span>Yellow powered quiz arena</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    QuizChain
                  </span>
                </h1>
                <p className="max-w-2xl text-sm text-slate-200/80 sm:text-base lg:text-lg">
                  Enter high-stakes trivia battles where every answer fuels your Yellow Network channel. Stake tokens, conquer leaderboard waves, and cash out instantly when the final buzzer sounds.
                </p>
              </div>
              {mounted && (
                <div className="flex flex-wrap gap-3">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition ${backendConnected ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/40 bg-rose-400/10 text-rose-200'}`}>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                    Backend {backendConnected ? 'Online' : 'Offline'}
                  </span>
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition ${yellowConnected ? 'border-sky-400/50 bg-sky-400/10 text-sky-200' : 'border-slate-500/60 bg-slate-700/40 text-slate-300/80'}`}>
                    <span className={`h-2 w-2 rounded-full ${yellowConnected ? 'bg-sky-300 animate-pulse' : 'bg-slate-300/60'}`} />
                    Yellow {yellowConnected ? 'Authenticated' : 'Standby'}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-cyan-500/10">
              <div className="space-y-4">
                {yellowConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">
                      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                      Yellow Network Linked
                    </div>
                    <button
                      onClick={requestTestTokens}
                      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]"
                    >
                      <span className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100" />
                      <span className="relative flex items-center justify-center gap-2">
                        <span role="img" aria-hidden>💰</span>
                        Request Test Tokens
                      </span>
                    </button>
                  </div>
                ) : isConnected ? (
                  <button
                    onClick={connectYellow}
                    className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-yellow-400/80 via-amber-400/70 to-orange-500/80 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_20px_45px_-15px_rgba(251,191,36,0.6)] transition hover:translate-y-[-1px] hover:shadow-[0_25px_60px_-20px_rgba(251,191,36,0.85)]"
                  >
                    <span className="absolute inset-0 bg-white/30 opacity-0 transition group-hover:opacity-100" />
                    <span className="relative flex items-center justify-center gap-2">
                      Connect to Yellow Network
                    </span>
                  </button>
                ) : (
                  <p className="text-sm text-slate-200/70">
                    Connect your wallet to unlock Yellow Network features, stake tokens, and join the arena.
                  </p>
                )}

                {yellowError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-rose-300" />
                      {yellowError}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/80">
                  <span>Primary Wallet</span>
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative max-w-6xl mx-auto">
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Connect Your Wallet to Start Playing
              </h2>
              <p className="text-gray-600 mb-8">
                Join blockchain-powered quizzes and compete for crypto prizes
              </p>
              <div className="inline-block">
                <ConnectButton />
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'lobby' && (
              <>
                {/* Show game if room status is active, playing, or in-progress */}
                {currentRoom && (currentRoom.status === 'active' || currentRoom.status === 'playing' || currentRoom.status === 'in-progress' || currentRoom.status === 'starting') ? (
                  <QuizGame />
                ) : currentRoom ? (
                  /* Room Lobby View */
                  <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_-60px_rgba(16,185,129,0.5)] backdrop-blur-2xl">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14)_0,_rgba(3,0,20,0.85)_55%,_rgba(3,0,20,0.98)_100%)]" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-3 rounded-full border border-emerald-300/60 bg-emerald-400/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-emerald-100">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                            <span>Room online</span>
                          </div>
                          <h3 className="mt-3 text-3xl font-black text-white sm:text-4xl">Room {currentRoom.code}</h3>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/80">Status • {currentRoom.status}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {currentRoom.host.walletAddress === address && (
                            <button
                              onClick={handleStartGameRoom}
                              disabled={currentRoom.participants.length < 1}
                              className={`group relative overflow-hidden rounded-2xl px-6 py-3 text-sm font-semibold transition ${
                                currentRoom.participants.length < 1
                                  ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/40'
                                  : 'border border-emerald-400/50 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 text-slate-950 shadow-[0_25px_60px_-20px_rgba(34,197,94,0.6)] hover:translate-y-[-1px]'
                              }`}
                            >
                              <span className="absolute inset-0 bg-white/30 opacity-0 transition group-hover:opacity-100" />
                              <span className="relative flex items-center gap-2">
                                <span role="img" aria-hidden>
                                  🚀
                                </span>
                                Launch Quiz
                              </span>
                            </button>
                          )}
                          <button
                            onClick={handleLeaveRoom}
                            className="group relative overflow-hidden rounded-2xl border border-rose-400/60 bg-rose-500/15 px-6 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-300/80"
                          >
                            <span className="absolute inset-0 bg-rose-500/20 opacity-0 transition group-hover:opacity-100" />
                            <span className="relative flex items-center gap-2">
                              <span role="img" aria-hidden>
                                ✖️
                              </span>
                              Leave Room
                            </span>
                          </button>
                        </div>
                      </div>

                      {currentRoom.participants.length < 1 && (
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-100">
                          <span role="img" aria-hidden>
                            ⚠️
                          </span>
                          Need at least 2 players to launch the game
                        </div>
                      )}

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-cyan-500/10">
                          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-300/70">
                            <span>Room Overview</span>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-cyan-100">
                              {currentRoom.currentPlayers}/{currentRoom.config.maxPlayers} players
                            </span>
                          </div>
                          <dl className="space-y-3 text-sm text-slate-200/90">
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Host</dt>
                              <dd className="font-semibold text-white">{currentRoom.host.username}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Entry Fee</dt>
                              <dd className="font-semibold text-cyan-200">
                                {currentRoom.config.entryFee} {currentRoom.config.asset}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Quiz Topic</dt>
                              <dd className="font-semibold text-white">{currentRoom.config.topic}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-purple-500/10">
                          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-300/70">
                            <span>Participants</span>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-purple-100">Live sync</span>
                          </div>
                          <div className="space-y-3 text-sm text-slate-200">
                            <div className="flex items-center justify-between rounded-xl border border-yellow-400/50 bg-yellow-500/15 px-3 py-2">
                              <div className="flex items-center gap-3">
                                <span className="h-2 w-2 animate-ping rounded-full bg-yellow-300" />
                                <span className="font-semibold text-white">{currentRoom.host.username}</span>
                              </div>
                              <span className="text-xs uppercase tracking-[0.3em] text-yellow-200">Host</span>
                            </div>
                            {currentRoom.participants.map((participant: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                                  <span className="text-white">{participant.username}</span>
                                </div>
                                <span className="text-xs uppercase tracking-[0.25em] text-slate-400/80">Ready</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_45px_140px_-70px_rgba(129,140,248,0.55)] backdrop-blur-2xl">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(196,181,253,0.16)_0,_rgba(3,0,20,0.88)_45%,_rgba(3,0,20,0.98)_100%)]" />
                    <div className="relative z-10 space-y-8">
                      <div className="flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-200/80">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-300" />
                            <span>Command center</span>
                          </div>
                          <h3 className="mt-3 text-3xl font-black text-white sm:text-4xl">Room Operations Hub</h3>
                          <p className="mt-2 max-w-2xl text-sm text-slate-300/80">
                            Spin up private arenas, beam into public rooms, and watch the lobby synchronize in real time. Every control below is tuned for high-stakes QuizChain matches.
                          </p>
                        </div>
                        <div className="flex flex-col items-stretch gap-2 text-xs text-slate-200/70 sm:text-sm">
                          <div className="flex items-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                            {backendConnected ? 'Lobby feed synced • Auto-refresh active' : 'Backend offline • reconnect to manage rooms'}
                          </div>
                          {!!availableRooms.length && (
                            <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100">
                              <span role="img" aria-hidden>
                                🛰️
                              </span>
                              {availableRooms.length} room{availableRooms.length === 1 ? '' : 's'} detected in orbit
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        ref={categoryGridRef}
                        onMouseMove={handleCategoryPointer}
                        onMouseLeave={handleCategoryLeave}
                        className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-[0_45px_140px_-80px_rgba(56,189,248,0.55)] backdrop-blur-2xl"
                      >
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-0 opacity-40"
                          style={{
                            backgroundImage:
                              'linear-gradient(0deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)',
                            backgroundSize: '42px 42px',
                            maskImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.85), transparent 70%)',
                            WebkitMaskImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.85), transparent 70%)'
                          }}
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-10 transition duration-300"
                          style={{
                            opacity: isPointerActive ? 1 : 0,
                            background: `radial-gradient(320px at ${categoryPointer.x}% ${categoryPointer.y}%, rgba(56, 189, 248, 0.18), transparent 75%)`
                          }}
                        />
                        <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
                          {FLOATING_BADGES.map((badge) => (
                            <div
                              key={badge.label}
                              className={`pointer-events-none absolute flex items-center gap-2 rounded-full bg-gradient-to-br ${badge.accent} px-3 py-1.5 text-[9px] font-semibold uppercase text-white/80 shadow-lg shadow-black/40 backdrop-blur transition-all duration-200`}
                              style={{
                                left: badge.baseX,
                                top: badge.baseY,
                                opacity: isPointerActive ? 0.9 : 0,
                                transform: `translate(${badge.translateX}, ${badge.translateY}) translate3d(${categoryPointer.offsetX * badge.parallax}px, ${categoryPointer.offsetY * badge.parallax}px, 0)`
                              }}
                            >
                              <span className="text-base leading-none opacity-90">{badge.icon}</span>
                              <span className="text-[9px] uppercase tracking-[0.4em] opacity-90">{badge.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="relative z-30 flex flex-col gap-6 border-b border-white/10 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1 space-y-2">
                            <h4 className="text-lg font-semibold text-white sm:text-xl">Pick Your Arena</h4>
                            <p className="text-sm text-slate-300/80 sm:text-[15px]">Scan curated ladders, explore the rule set, and spin up a tailored room with one decisive click.</p>
                          </div>
                          <div className="flex flex-col gap-3 text-xs text-slate-200/70 sm:text-[12px] lg:items-end">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/15 px-3 py-1 font-semibold text-white/80">
                                {filteredCategories.length} curated modes
                              </span>
                              <span className="rounded-full border border-white/15 px-3 py-1 font-semibold text-white/60">
                                Filter · {activeFilterLabel}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {CATEGORY_FILTERS.map((filter) => (
                                <button
                                  key={filter.id}
                                  type="button"
                                  onClick={() => setActiveCategoryFilter(filter.id)}
                                  aria-pressed={activeCategoryFilter === filter.id}
                                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] transition duration-200 ${
                                    activeCategoryFilter === filter.id
                                      ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100 shadow-[0_18px_45px_-35px_rgba(34,211,238,0.8)]'
                                      : 'border-white/10 bg-slate-900/40 text-slate-300/80 hover:border-cyan-400/50 hover:text-cyan-100'
                                  }`}
                                >
                                  {filter.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="relative z-30 grid gap-4 px-6 pb-6 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                          {filteredCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleSelectCategory(category.id)}
                              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:shadow-[0_25px_60px_-40px_rgba(56,189,248,0.9)] focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                            >
                              <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${category.accent} opacity-0 transition group-hover:opacity-100`} />
                              <div className="relative z-10 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-2xl">{category.icon}</span>
                                  <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                                    {category.difficulty}
                                  </span>
                                </div>
                                <div>
                                  <h5 className="text-lg font-semibold text-white">{category.title}</h5>
                                  <p className="mt-1 text-xs text-slate-200/80">{category.description}</p>
                                </div>
                                <div className="flex items-center justify-between text-xs text-cyan-200/80">
                                  <span>{category.averagePot}</span>
                                  <span className="inline-flex items-center gap-1 text-cyan-100">
                                    Build room
                                    <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                          {!filteredCategories.length && (
                            <div className="col-span-full rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300/80">
                              No categories match this filter just yet—check back soon for fresh ladders.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-purple-500/10">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => {
                                setShowCreateRoom(!showCreateRoom)
                                setShowJoinRoom(false)
                              }}
                              className={`group relative flex-1 overflow-hidden rounded-2xl border px-5 py-4 text-sm font-semibold transition ${
                                showCreateRoom
                                  ? 'border-emerald-400/70 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 text-slate-950 shadow-[0_25px_70px_-30px_rgba(16,185,129,0.7)]'
                                  : 'border-white/10 bg-white/5 text-white/80 hover:border-emerald-300/60 hover:text-white'
                              }`}
                            >
                              {showCreateRoom && <span className="absolute inset-0 bg-white/20 opacity-50" />}
                              <span className="relative flex items-center justify-center gap-2">
                                <span role="img" aria-hidden>
                                  ✨
                                </span>
                                Launch Room Builder
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setShowJoinRoom(!showJoinRoom)
                                setShowCreateRoom(false)
                              }}
                              className={`group relative flex-1 overflow-hidden rounded-2xl border px-5 py-4 text-sm font-semibold transition ${
                                showJoinRoom
                                  ? 'border-indigo-400/70 bg-gradient-to-r from-indigo-400 via-violet-500 to-fuchsia-500 text-white shadow-[0_25px_70px_-30px_rgba(99,102,241,0.7)]'
                                  : 'border-white/10 bg-white/5 text-white/80 hover:border-indigo-400/70 hover:text-white'
                              }`}
                            >
                              {showJoinRoom && <span className="absolute inset-0 bg-white/20 opacity-50" />}
                              <span className="relative flex items-center justify-center gap-2">
                                <span role="img" aria-hidden>
                                  🚀
                                </span>
                                Fast Join Portal
                              </span>
                            </button>
                            <button
                              onClick={loadRooms}
                              disabled={isLoadingRooms}
                              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white/70 transition hover:border-cyan-300/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                            >
                              <span className="absolute inset-0 bg-slate-100/10 opacity-0 transition hover:opacity-100" />
                              <span className="relative flex items-center justify-center gap-2">
                                <span className="h-2 w-2 animate-spin rounded-full border border-transparent border-t-cyan-300" />
                                {isLoadingRooms ? 'Scanning lobby...' : 'Refresh constellation'}
                              </span>
                            </button>
                          </div>

                          <div className="mt-6 grid gap-3 text-xs text-slate-200/80 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400/70">Public rooms</div>
                              <div className="mt-1 text-base font-semibold text-white">Browse below</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400/70">Private lobbies</div>
                              <div className="mt-1 text-base font-semibold text-white">Use access code</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400/70">Auto sync</div>
                              <div className="mt-1 text-base font-semibold text-white">Every 10 seconds</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-inner shadow-slate-900/40">
                          {!showCreateRoom && !showJoinRoom && (
                            <div className="h-full rounded-2xl border border-dashed border-white/10 p-6 text-center">
                              <h4 className="text-lg font-semibold text-white">Select an action to begin</h4>
                              <p className="mt-2 text-sm text-slate-300/80">Open the room builder or the join portal to configure your next match.</p>
                            </div>
                          )}

                          {showCreateRoom && (
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <h4 className="text-2xl font-bold text-white">Design New Room</h4>
                                <p className="text-sm text-slate-300/70">Set your stake, curate the topic, and decide who gets in.</p>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex flex-col gap-2 text-sm text-slate-300/80">
                                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Entry fee</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="0.1"
                                    value={roomConfig.entryFee}
                                    onChange={(e) => setRoomConfig({ ...roomConfig, entryFee: parseFloat(e.target.value) || 0 })}
                                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-cyan-500/10 focus:border-cyan-400/70 focus:outline-none"
                                  />
                                </label>
                                <label className="flex flex-col gap-2 text-sm text-slate-300/80">
                                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Asset</span>
                                  <select
                                    value={roomConfig.asset}
                                    onChange={(e) => setRoomConfig({ ...roomConfig, asset: e.target.value as any })}
                                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-cyan-500/10 focus:border-cyan-400/70 focus:outline-none"
                                  >
                                    <option value="USDC">💵 USDC</option>
                                    <option value="USDT">💵 USDT</option>
                                    <option value="DAI">💵 DAI</option>
                                    <option value="USDC.e">💵 USDC.e (Bridged)</option>
                                    <option value="WETH">⟠ WETH</option>
                                    <option value="WBTC">₿ WBTC</option>
                                  </select>
                                </label>
                                <label className="flex flex-col gap-2 text-sm text-slate-300/80">
                                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Max players</span>
                                  <input
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={roomConfig.maxPlayers}
                                    onChange={(e) => setRoomConfig({ ...roomConfig, maxPlayers: parseInt(e.target.value) || 2 })}
                                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-cyan-500/10 focus:border-cyan-400/70 focus:outline-none"
                                  />
                                </label>
                                <label className="flex flex-col gap-2 text-sm text-slate-300/80">
                                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Quiz topic</span>
                                  <select
                                    value={roomConfig.topic}
                                    onChange={(e) => setRoomConfig({ ...roomConfig, topic: e.target.value })}
                                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-cyan-500/10 focus:border-cyan-400/70 focus:outline-none"
                                  >
                                    <option value="Random">🎲 Random Mix (All Topics)</option>
                                    <option value="All">📚 All Topics Combined</option>
                                    <option value="Age">👴 Age Problems</option>
                                    <option value="MixtureAndAlligation">🧪 Mixture & Alligation</option>
                                    <option value="ProfitAndLoss">💰 Profit and Loss</option>
                                    <option value="SpeedTimeDistance">🚀 Speed, Time & Distance</option>
                                    <option value="PipesAndCisterns">🚰 Pipes and Cisterns</option>
                                    <option value="SimpleInterest">💵 Simple Interest</option>
                                    <option value="Calendars">📅 Calendars</option>
                                    <option value="PermutationAndCombination">🔢 Permutation & Combination</option>
                                  </select>
                                </label>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-white">Room privacy</span>
                                  <button
                                    type="button"
                                    onClick={() => setRoomConfig({ ...roomConfig, isPublic: !roomConfig.isPublic, password: roomConfig.isPublic ? roomConfig.password : '' })}
                                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                      roomConfig.isPublic
                                        ? 'bg-emerald-400/20 text-emerald-100'
                                        : 'bg-amber-400/25 text-amber-100'
                                    }`}
                                  >
                                    {roomConfig.isPublic ? 'Public' : 'Private'}
                                  </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-300/70">
                                  {roomConfig.isPublic ? 'Anyone scanning the lobby can warp into your arena.' : 'Only players with the secret phrase can join this lobby.'}
                                </p>

                                {!roomConfig.isPublic && (
                                  <div className="mt-4">
                                    <label className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400/80">Access code</label>
                                    <input
                                      type="text"
                                      value={roomConfig.password}
                                      onChange={(e) => setRoomConfig({ ...roomConfig, password: e.target.value })}
                                      placeholder="Enter room password"
                                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-purple-500/10 focus:border-purple-400/70 focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={handleCreateRoom}
                                disabled={isCreatingRoom || !backendConnected || (!roomConfig.isPublic && !roomConfig.password)}
                                className="group relative w-full overflow-hidden rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500 px-6 py-3 text-lg font-bold text-slate-950 shadow-[0_35px_80px_-35px_rgba(16,185,129,0.75)] transition hover:translate-y-[-1px] disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
                              >
                                <span className="absolute inset-0 bg-white/30 opacity-0 transition group-hover:opacity-100" />
                                <span className="relative flex items-center justify-center gap-3">
                                  <span role="img" aria-hidden>
                                    🛠️
                                  </span>
                                  {isCreatingRoom ? 'Deploying layout...' : 'Create Arena'}
                                </span>
                              </button>
                              {!roomConfig.isPublic && !roomConfig.password && (
                                <p className="text-xs text-rose-200/90">Private rooms need an access code before launch.</p>
                              )}
                            </div>
                          )}

                          {showJoinRoom && (
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <h4 className="text-2xl font-bold text-white">Join Existing Room</h4>
                                <p className="text-sm text-slate-300/70">Beam into a live lobby using its access code and optional password.</p>
                              </div>
                              <div className="space-y-4">
                                <label className="flex flex-col gap-2 text-sm text-slate-300/80">
                                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Room code</span>
                                  <input
                                    type="text"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                    placeholder="Enter 6-character code (e.g., ABC123)"
                                    maxLength={6}
                                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-base font-mono tracking-[0.4em] text-white shadow-inner shadow-purple-500/10 focus:border-purple-400/70 focus:outline-none"
                                  />
                                </label>
                                <label className="flex flex-col gap-2 text-sm text-slate-300/80">
                                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Password (if required)</span>
                                  <input
                                    type="password"
                                    value={roomPassword}
                                    onChange={(e) => setRoomPassword(e.target.value)}
                                    placeholder="Leave empty if no password"
                                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white shadow-inner shadow-purple-500/10 focus:border-purple-400/70 focus:outline-none"
                                  />
                                </label>
                                <button
                                  onClick={() => handleJoinRoom()}
                                  disabled={isJoiningRoom || !backendConnected || !roomCode.trim()}
                                  className="group relative w-full overflow-hidden rounded-2xl border border-indigo-400/60 bg-gradient-to-r from-indigo-400 via-violet-500 to-fuchsia-500 px-6 py-3 text-lg font-bold text-white shadow-[0_35px_80px_-35px_rgba(129,140,248,0.8)] transition hover:translate-y-[-1px] disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
                                >
                                  <span className="absolute inset-0 bg-white/30 opacity-0 transition group-hover:opacity-100" />
                                  <span className="relative flex items-center justify-center gap-3">
                                    <span role="img" aria-hidden>
                                      🌌
                                    </span>
                                    {isJoiningRoom ? 'Initiating warp...' : 'Enter Arena'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {availableRooms.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-xl font-bold text-white">Live Rooms Feed</h4>
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-400/80">Tap a card to quick-join</p>
                            </div>
                            <span className="rounded-full border border-white/15 px-4 py-1 text-sm font-semibold text-white/70">
                              {availableRooms.length} active lobby{availableRooms.length === 1 ? '' : 'ies'}
                            </span>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            {availableRooms.map((room) => (
                              <button
                                key={room.id}
                                onClick={() => handleQuickJoin(room)}
                                disabled={isJoiningRoom}
                                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-[0_30px_90px_-50px_rgba(79,70,229,0.8)] transition hover:border-white/20 disabled:border-white/5 disabled:bg-white/10"
                              >
                                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                                <div className="relative z-10 flex items-start justify-between gap-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-3xl font-black tracking-[0.3em] text-white">{room.code}</span>
                                      {room.config.hasPassword && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100">
                                          🔒 Private
                                        </span>
                                      )}
                                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-100">
                                        {room.config.topic === 'Random'
                                          ? 'Random'
                                          : room.config.topic === 'All'
                                            ? 'All Topics'
                                            : room.config.topic}
                                      </span>
                                    </div>
                                    <div className="grid gap-2 text-sm text-slate-200/80 sm:grid-cols-3">
                                      <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                        <span role="img" aria-hidden>
                                          💰
                                        </span>
                                        {room.config.entryFee} {room.config.asset}
                                      </span>
                                      <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                        <span role="img" aria-hidden>
                                          👥
                                        </span>
                                        {room.currentPlayers}/{room.config.maxPlayers} players
                                      </span>
                                      <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                        <span role="img" aria-hidden>
                                          🏠
                                        </span>
                                        Host {room.host.username}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-500/20 text-lg font-bold text-white transition group-hover:translate-x-1">{isJoiningRoom ? '...' : '→'}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {availableRooms.length === 0 && !isLoadingRooms && backendConnected && (
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-200/80">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-3xl">
                            📭
                          </div>
                          <h4 className="mt-4 text-xl font-semibold text-white">No rooms detected</h4>
                          <p className="mt-2 text-sm">Spin up a new arena or invite friends to deploy one.</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400/80">Auto scan running every 10 seconds</p>
                        </div>
                      )}

                      {isLoadingRooms && availableRooms.length === 0 && (
                        <div className="flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-slate-200/70">
                          <span className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-purple-300" />
                          Scanning for active rooms...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Old quiz game view - now handled through rooms */}
            {/* 
            {currentView === 'game' && gameState.currentQuiz && (
              <QuizGame
                quiz={gameState.currentQuiz}
                currentQuestion={gameState.currentQuestion}
                questionIndex={gameState.questionIndex}
                totalQuestions={gameState.currentQuiz.questions.length}
                timeRemaining={gameState.timeRemaining}
                isGameActive={gameState.isGameActive}
                onAnswerSubmit={handleAnswerSubmit}
                onStartGame={handleStartGame}
                onTimeUp={handleTimeUp}
                onBackToLobby={handleBackToLobby}
              />
            )}
            */}
            
            {currentView === 'results' && gameState.currentQuiz && (
              <QuizResults
                quiz={gameState.currentQuiz}
                userAnswers={gameState.userAnswers}
                finalScore={gameState.score}
                onBackToLobby={handleBackToLobby}
              />
            )}
          </>
        )}
      </main>
    </div>
  </div>
  )
}