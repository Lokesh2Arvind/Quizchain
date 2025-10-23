'use client'

import { useState, useEffect } from 'react'
import { formatTime } from '../lib/utils'
import type { Quiz, Question } from '../types'

interface QuizGameProps {
  quiz: Quiz
  currentQuestion: Question | null
  questionIndex: number
  totalQuestions: number
  timeRemaining: number
  isGameActive: boolean
  onAnswerSubmit: (answerIndex: number) => void
  onStartGame: () => void
  onTimeUp: () => void
  onBackToLobby: () => void
}

export function QuizGame({
  quiz,
  currentQuestion,
  questionIndex,
  totalQuestions,
  timeRemaining,
  isGameActive,
  onAnswerSubmit,
  onStartGame,
  onTimeUp,
  onBackToLobby
}: QuizGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)

  // Timer countdown effect
  useEffect(() => {
    if (isGameActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        if (timeRemaining === 1) {
          onTimeUp()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeRemaining, isGameActive, onTimeUp])

  const handleAnswerSelect = (index: number) => {
    if (!isGameActive || selectedAnswer !== null) return
    
    setSelectedAnswer(index)
    setShowCorrectAnswer(true)
    
    // Auto-submit after showing correct answer briefly
    setTimeout(() => {
      onAnswerSubmit(index)
      setSelectedAnswer(null)
      setShowCorrectAnswer(false)
    }, 2000)
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Get Ready for: {quiz.title}
          </h2>
          <p className="text-gray-600 mb-6">{quiz.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${(quiz.prizePool / 1000000).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Prize Pool</div>
            </div>
          </div>

          <button
            onClick={onStartGame}
            className="quiz-button quiz-button-primary text-lg px-8 py-4"
          >
            Start Quiz
          </button>
          
          <button
            onClick={onBackToLobby}
            className="quiz-button quiz-button-secondary ml-4 px-6 py-3"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{quiz.title}</h2>
            <p className="text-gray-600">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-3xl font-bold font-mono ${
              timeRemaining <= 10 ? 'text-red-600 quiz-timer' : 'text-blue-600'
            }`}>
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-600">Time Remaining</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg">
        <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          {currentQuestion.text}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => {
            let buttonClass = 'p-6 rounded-lg border-2 transition-all duration-200 text-left '
            
            if (selectedAnswer === null) {
              buttonClass += 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
            } else if (showCorrectAnswer) {
              if (index === currentQuestion.correctAnswer) {
                buttonClass += 'border-green-500 bg-green-100 correct-answer'
              } else if (index === selectedAnswer) {
                buttonClass += 'border-red-500 bg-red-100 wrong-answer'
              } else {
                buttonClass += 'border-gray-200 bg-gray-50'
              }
            }
            
            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={!isGameActive || selectedAnswer !== null}
                className={buttonClass}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-4 font-bold">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-lg">{option}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <button
          onClick={onBackToLobby}
          className="quiz-button quiz-button-secondary"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}