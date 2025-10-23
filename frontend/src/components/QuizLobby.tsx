'use client'

import { useState, useEffect } from 'react'
import { formatTime, getTimeUntilStart, formatTokenAmount } from '../lib/utils'
import type { Quiz } from '../types'

interface QuizLobbyProps {
  quizzes: Quiz[]
  onJoinQuiz: (quiz: Quiz) => void
}

export function QuizLobby({ quizzes, onJoinQuiz }: QuizLobbyProps) {
  const [timeLeft, setTimeLeft] = useState<{[key: string]: number}>({})

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft: {[key: string]: number} = {}
      quizzes.forEach(quiz => {
        newTimeLeft[quiz.id] = getTimeUntilStart(quiz.startTime)
      })
      setTimeLeft(newTimeLeft)
    }, 1000)

    return () => clearInterval(interval)
  }, [quizzes])

  const QuizCard = ({ quiz }: { quiz: Quiz }) => {
    const countdown = timeLeft[quiz.id] || 0
    const canJoin = countdown > 0 && quiz.currentParticipants < quiz.maxParticipants
    const isStartingSoon = countdown <= 300 && countdown > 0 // 5 minutes

    return (
      <div className="quiz-card p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{quiz.title}</h3>
            <p className="text-gray-600 text-sm">{quiz.description}</p>
          </div>
          {isStartingSoon && (
            <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">
              Starting Soon!
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Prize Pool:</span>
            <span className="font-bold text-green-600">
              {formatTokenAmount(quiz.prizePool.toString())} USDC
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Entry Fee:</span>
            <span className="font-semibold">
              {formatTokenAmount(quiz.entryFee.toString())} USDC
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Participants:</span>
            <span className="font-semibold">
              {quiz.currentParticipants}/{quiz.maxParticipants}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(quiz.currentParticipants / quiz.maxParticipants) * 100}%` 
              }}
            />
          </div>
        </div>

        {countdown > 0 ? (
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-1">Starts in:</div>
            <div className="text-2xl font-bold text-blue-600 font-mono">
              {formatTime(countdown)}
            </div>
          </div>
        ) : (
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-red-600">
              Quiz Started
            </div>
          </div>
        )}

        <button
          onClick={() => onJoinQuiz(quiz)}
          disabled={!canJoin}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
            canJoin
              ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {countdown <= 0 
            ? 'Quiz Started' 
            : quiz.currentParticipants >= quiz.maxParticipants
            ? 'Quiz Full'
            : 'Join Quiz'
          }
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Available Quizzes
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Join upcoming quiz games, test your knowledge, and win crypto prizes!
          Entry fees go into the prize pool for winners.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map(quiz => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              No Quizzes Available
            </h3>
            <p className="text-gray-600">
              Check back later for new quiz games!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}