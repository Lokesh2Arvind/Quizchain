'use client'

import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useYellow } from '@/lib/yellow-context'
import { QuizLobby } from '@/components/QuizLobby'
import { QuizGame } from '@/components/QuizGame'
import { QuizResults } from '@/components/QuizResults'
import type { Quiz, GameState } from '@/types'

// Mock quiz data for demonstration
const mockQuizzes: Quiz[] = [
  {
    id: '1',
    title: 'Crypto Fundamentals',
    description: 'Test your knowledge of blockchain and cryptocurrency basics',
    host: '0x1234567890123456789012345678901234567890',
    questions: [
      {
        id: '1',
        text: 'What does "DeFi" stand for?',
        options: ['Decentralized Finance', 'Digital Finance', 'Distributed Finance', 'Delegated Finance'],
        correctAnswer: 0,
        timeLimit: 30
      },
      {
        id: '2', 
        text: 'Which consensus mechanism does Bitcoin use?',
        options: ['Proof of Stake', 'Proof of Work', 'Delegated Proof of Stake', 'Proof of Authority'],
        correctAnswer: 1,
        timeLimit: 30
      },
      {
        id: '3',
        text: 'What is a smart contract?',
        options: ['A paper contract', 'Self-executing contract with terms in code', 'A legal document', 'A trading strategy'],
        correctAnswer: 1,
        timeLimit: 30
      }
    ],
    prizePool: 1000,
    entryFee: 10,
    startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    endTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    maxParticipants: 10,
    currentParticipants: 3,
    participants: ['0x1111', '0x2222', '0x3333'],
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Web3 Gaming',
    description: 'Challenge yourself with Web3 and gaming questions',
    host: '0x2345678901234567890123456789012345678901',
    questions: [],
    prizePool: 500,
    entryFee: 5,
    startTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    maxParticipants: 20,
    currentParticipants: 8,
    participants: [],
    status: 'upcoming'
  }
]

export default function Home() {
  const { address, isConnected } = useAccount()
  const { isConnected: yellowConnected, connect: connectYellow, error: yellowError } = useYellow()
  
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

  // Auto-connect to Yellow when wallet is connected
  useEffect(() => {
    if (isConnected && !yellowConnected && !yellowError) {
      connectYellow()
    }
  }, [isConnected, yellowConnected, yellowError, connectYellow])

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              QuizChain
            </h1>
            <p className="text-gray-600 mt-1">Decentralized Quiz Gaming</p>
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
              <QuizLobby 
                quizzes={mockQuizzes}
                onJoinQuiz={handleJoinQuiz}
              />
            )}
            
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