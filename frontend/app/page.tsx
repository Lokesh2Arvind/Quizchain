'use client'

import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useYellow } from '@/lib/yellow-context'
import { useBackend } from '@/lib/backend-context'
import QuizGame from '@/components/QuizGame'
import { QuizResults } from '@/components/QuizResults'
import type { Quiz, GameState } from '@/types'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { isConnected: yellowConnected, connect: connectYellow, error: yellowError } = useYellow()
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
      timeRemaining: quiz.questions[0]?.timeLimit || 30,
      userAnswers: [],
      score: 0,
      isGameActive: false
    }))
    setCurrentView('game')
  }

  const handleStartGame = () => {
    if (gameState.currentQuiz && gameState.currentQuestion) {
      setGameState(prev => ({ 
        ...prev, 
        isGameActive: true,
        timeRemaining: prev.currentQuestion?.timeLimit || 30
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
    <div className="min-h-screen p-4">
      <header className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              QuizChain
            </h1>
            <p className="text-gray-600 text-sm mt-1">Real-time quiz battles powered by Yellow Network</p>
            
            {/* Connection Status Indicators - only after mount to prevent hydration errors */}
            {mounted && (
              <div className="flex gap-3 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${backendConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Backend: {backendConnected ? '✓ Connected' : '✗ Disconnected'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${yellowConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  Yellow: {yellowConnected ? '✓ Connected' : '○ Standby'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {yellowConnected && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Yellow Connected
              </div>
            )}
            
            {yellowError && (
              <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Connection Error
              </div>
            )}
            
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
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
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold mb-1">Room: {currentRoom.code}</h3>
                        <p className="text-sm text-gray-500">Status: {currentRoom.status}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        Active Room
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Room Details</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex justify-between">
                            <span className="text-gray-600">Host:</span>
                            <span className="font-medium">{currentRoom.host.username}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-600">Players:</span>
                            <span className="font-medium">{currentRoom.currentPlayers}/{currentRoom.config.maxPlayers}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-600">Entry Fee:</span>
                            <span className="font-medium">{currentRoom.config.entryFee} {currentRoom.config.asset}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-600">Topic:</span>
                            <span className="font-medium">{currentRoom.config.topic}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700">Participants</h4>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="font-medium">{currentRoom.host.username}</span>
                            <span className="text-xs text-gray-500">(Host)</span>
                          </div>
                          {currentRoom.participants.map((p: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>{p.username}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      {currentRoom.host.walletAddress === address && (
                        <button
                          onClick={handleStartGameRoom}
                          disabled={currentRoom.participants.length < 1}
                          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                            currentRoom.participants.length < 1
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          Start Game
                        </button>
                      )}
                      <button
                        onClick={handleLeaveRoom}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                      >
                        Leave Room
                      </button>
                      {currentRoom.participants.length < 1 && (
                        <p className="text-sm text-gray-500 flex items-center">
                          ⚠️ Need at least 2 players to start
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg mb-6">
                    <h3 className="text-xl font-bold mb-4">🎮 Room Management</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Create a new room or join an existing one to start playing!
                      {availableRooms.length > 0 && (
                        <span className="ml-2 text-green-600 font-semibold">
                          • {availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} available
                        </span>
                      )}
                    </p>
                    
                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => {
                          setShowCreateRoom(!showCreateRoom)
                          setShowJoinRoom(false)
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                          showCreateRoom
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        ➕ Create Room
                      </button>
                      <button
                        onClick={() => {
                          setShowJoinRoom(!showJoinRoom)
                          setShowCreateRoom(false)
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                          showJoinRoom
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                      >
                        🚪 Join Room
                      </button>
                      <button
                        onClick={loadRooms}
                        disabled={isLoadingRooms}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors disabled:opacity-50"
                      >
                        {isLoadingRooms ? '⏳ Loading...' : `🔄 Refresh`}
                      </button>
                    </div>

                    {/* Tips for joining */}
                    <div className="flex gap-2 text-xs text-gray-600 mt-2">
                      <div className="flex-1 p-2 bg-blue-50 rounded border border-blue-200">
                        💡 <span className="font-semibold">Public rooms</span> appear below
                      </div>
                      <div className="flex-1 p-2 bg-orange-50 rounded border border-orange-200">
                        🔒 <span className="font-semibold">Private rooms?</span> Enter code manually
                      </div>
                    </div>

                    {/* Auto-refresh indicator */}
                    {!currentRoom && backendConnected && (
                      <p className="text-xs text-gray-500 mt-2">
                        🔄 Auto-refreshing rooms every 10 seconds
                      </p>
                    )}

                    {/* Create Room Form */}
                    {showCreateRoom && (
                      <div className="mt-4 p-5 bg-linear-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                        <h4 className="font-bold text-lg mb-4 text-blue-900">Create New Room</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-800">Entry Fee</label>
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="0.1"
                              value={roomConfig.entryFee}
                              onChange={(e) => setRoomConfig({ ...roomConfig, entryFee: parseFloat(e.target.value) || 0 })}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-900 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-800">Asset/Token</label>
                            <select
                              value={roomConfig.asset}
                              onChange={(e) => setRoomConfig({ ...roomConfig, asset: e.target.value as any })}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-900 font-semibold appearance-none cursor-pointer"
                              style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                            >
                              <option value="USDC" className="font-semibold">💵 USDC</option>
                              <option value="USDT" className="font-semibold">💵 USDT</option>
                              <option value="DAI" className="font-semibold">💵 DAI</option>
                              <option value="USDC.e" className="font-semibold">💵 USDC.e (Bridged)</option>
                              <option value="WETH" className="font-semibold">⟠ WETH</option>
                              <option value="WBTC" className="font-semibold">₿ WBTC</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-800">Max Players</label>
                            <input
                              type="number"
                              min="2"
                              max="10"
                              value={roomConfig.maxPlayers}
                              onChange={(e) => setRoomConfig({ ...roomConfig, maxPlayers: parseInt(e.target.value) || 2 })}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-900 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-800">Quiz Topic</label>
                            <select
                              value={roomConfig.topic}
                              onChange={(e) => setRoomConfig({ ...roomConfig, topic: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-900 font-semibold appearance-none cursor-pointer"
                              style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                            >
                              <option value="Random" className="font-semibold">🎲 Random Mix (All Topics)</option>
                              <option value="All" className="font-semibold">📚 All Topics Combined</option>
                              <option value="Age" className="font-semibold">👴 Age Problems</option>
                              <option value="MixtureAndAlligation" className="font-semibold">🧪 Mixture & Alligation</option>
                              <option value="ProfitAndLoss" className="font-semibold">💰 Profit and Loss</option>
                              <option value="SpeedTimeDistance" className="font-semibold">🚀 Speed, Time & Distance</option>
                              <option value="PipesAndCisterns" className="font-semibold">� Pipes and Cisterns</option>
                              <option value="SimpleInterest" className="font-semibold">💵 Simple Interest</option>
                              <option value="Calendars" className="font-semibold">📅 Calendars</option>
                              <option value="PermutationAndCombination" className="font-semibold">🔢 Permutation & Combination</option>
                            </select>
                          </div>
                        </div>

                        {/* Room Privacy Settings */}
                        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-gray-300">
                          <div className="flex items-center justify-between mb-3">
                            <label className="font-semibold text-gray-800 flex items-center gap-2">
                              <span>{roomConfig.isPublic ? '🌐' : '🔒'}</span>
                              <span>Room Privacy</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setRoomConfig({ ...roomConfig, isPublic: !roomConfig.isPublic, password: roomConfig.isPublic ? roomConfig.password : '' })}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                roomConfig.isPublic
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              }`}
                            >
                              {roomConfig.isPublic ? 'Public' : 'Private'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {roomConfig.isPublic 
                              ? '✓ Anyone can see and join this room' 
                              : '✓ Only players with the password can join'}
                          </p>
                          
                          {!roomConfig.isPublic && (
                            <div className="mt-3">
                              <label className="block text-sm font-semibold mb-2 text-gray-800">Set Password</label>
                              <input
                                type="text"
                                value={roomConfig.password}
                                onChange={(e) => setRoomConfig({ ...roomConfig, password: e.target.value })}
                                placeholder="Enter room password"
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none bg-white text-gray-900 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleCreateRoom}
                          disabled={isCreatingRoom || !backendConnected || (!roomConfig.isPublic && !roomConfig.password)}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {isCreatingRoom ? '⏳ Creating...' : '✨ Create Room'}
                        </button>
                        {!roomConfig.isPublic && !roomConfig.password && (
                          <p className="text-xs text-red-600 mt-2 text-center">⚠️ Private rooms require a password</p>
                        )}
                      </div>
                    )}

                    {/* Join Room Form */}
                    {showJoinRoom && (
                      <div className="mt-4 p-5 bg-linear-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200">
                        <h4 className="font-bold text-lg mb-4 text-purple-900">Join Existing Room</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Room Code</label>
                            <input
                              type="text"
                              value={roomCode}
                              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                              placeholder="Enter 6-character code (e.g., ABC123)"
                              maxLength={6}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg font-mono tracking-wider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Password (if required)</label>
                            <input
                              type="password"
                              value={roomPassword}
                              onChange={(e) => setRoomPassword(e.target.value)}
                              placeholder="Leave empty if no password"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => handleJoinRoom()}
                            disabled={isJoiningRoom || !backendConnected || !roomCode.trim()}
                            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isJoiningRoom ? '⏳ Joining...' : '🚀 Join Room'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Available Rooms List */}
                    {availableRooms.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <span>📋 Available Rooms</span>
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                            {availableRooms.length}
                          </span>
                        </h4>
                        <div className="space-y-3">
                          {availableRooms.map((room) => (
                            <div key={room.id} className="p-4 bg-linear-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl font-bold font-mono text-purple-700">{room.code}</span>
                                    {room.config.hasPassword && (
                                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold flex items-center gap-1">
                                        🔒 Private
                                      </span>
                                    )}
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                      {room.config.topic === 'Random' ? '🎲 Random' : room.config.topic === 'All' ? '📚 All Topics' : room.config.topic}
                                    </span>
                                  </div>
                                  <div className="flex gap-4 text-sm text-gray-600">
                                    <span>💰 {room.config.entryFee} {room.config.asset}</span>
                                    <span>👥 {room.currentPlayers}/{room.config.maxPlayers} players</span>
                                    <span>🏠 Host: {room.host.username}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleQuickJoin(room)}
                                  disabled={isJoiningRoom}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {isJoiningRoom ? '⏳' : 'Join →'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {availableRooms.length === 0 && !isLoadingRooms && backendConnected && (
                      <div className="mt-4 p-6 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-500 mb-2">📭 No rooms available</p>
                        <p className="text-sm text-gray-400">Create a new room to get started!</p>
                        <p className="text-xs text-gray-400 mt-2">Rooms will auto-refresh every 10 seconds</p>
                      </div>
                    )}

                    {isLoadingRooms && availableRooms.length === 0 && (
                      <div className="mt-4 p-6 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-500">⏳ Loading available rooms...</p>
                      </div>
                    )}
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
  )
}