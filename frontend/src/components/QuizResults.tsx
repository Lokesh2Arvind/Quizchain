'use client'

import { useState } from 'react'
import { formatTokenAmount, calculateScore } from '../lib/utils'
import type { Quiz, UserAnswer } from '../types'

interface QuizResultsProps {
  quiz: Quiz
  userAnswers: UserAnswer[]
  finalScore: number
  onBackToLobby: () => void
}

export function QuizResults({ quiz, userAnswers, finalScore, onBackToLobby }: QuizResultsProps) {
  const [showAnswers, setShowAnswers] = useState(false)
  
  const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length
  const totalQuestions = quiz.questions.length
  const scorePercentage = calculateScore(correctAnswers, totalQuestions)
  
  // Mock prize calculation (in real app, this would come from Yellow SDK)
  const prizeWon = scorePercentage >= 70 ? quiz.prizePool * 0.4 : 0
  const rank = scorePercentage >= 70 ? 1 : Math.floor(Math.random() * 5) + 2

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Results Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg text-center">
        <div className="mb-6">
          {scorePercentage >= 70 ? (
            <div>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                Congratulations!
              </h2>
              <p className="text-gray-600">You scored in the top performers!</p>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-3xl font-bold text-blue-600 mb-2">
                Quiz Complete!
              </h2>
              <p className="text-gray-600">Thanks for participating!</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{correctAnswers}</div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{scorePercentage}%</div>
            <div className="text-sm text-gray-600">Score</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">#{rank}</div>
            <div className="text-sm text-gray-600">Rank</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {prizeWon > 0 ? formatTokenAmount(prizeWon.toString()) : '0'}
            </div>
            <div className="text-sm text-gray-600">Prize Won</div>
          </div>
        </div>

        {prizeWon > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              Prize Available for Withdrawal!
            </h3>
            <p className="text-green-700 mb-4">
              You won {formatTokenAmount(prizeWon.toString())} USDC from the prize pool.
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Withdraw Prize
            </button>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="quiz-button quiz-button-secondary"
          >
            {showAnswers ? 'Hide' : 'Show'} Answer Review
          </button>
          
          <button
            onClick={onBackToLobby}
            className="quiz-button quiz-button-primary"
          >
            Back to Lobby
          </button>
        </div>
      </div>

      {/* Answer Review */}
      {showAnswers && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Answer Review</h3>
          
          <div className="space-y-6">
            {quiz.questions.map((question, index) => {
              const userAnswer = userAnswers[index]
              const isCorrect = userAnswer?.isCorrect ?? false
              
              return (
                <div key={question.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800 flex-1">
                      {index + 1}. {question.text}
                    </h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      isCorrect 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option, optionIndex) => {
                      let optionClass = 'p-3 rounded border text-left '
                      
                      if (optionIndex === question.correctAnswer) {
                        optionClass += 'border-green-500 bg-green-50 text-green-800'
                      } else if (optionIndex === userAnswer?.selectedAnswer && !isCorrect) {
                        optionClass += 'border-red-500 bg-red-50 text-red-800'
                      } else {
                        optionClass += 'border-gray-200 bg-gray-50'
                      }
                      
                      return (
                        <div key={optionIndex} className={optionClass}>
                          <div className="flex items-center">
                            <span className="font-mono font-bold mr-2">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span>{option}</span>
                            {optionIndex === question.correctAnswer && (
                              <span className="ml-auto text-green-600">✓</span>
                            )}
                            {optionIndex === userAnswer?.selectedAnswer && !isCorrect && (
                              <span className="ml-auto text-red-600">✗</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {userAnswer && (
                    <div className="mt-4 text-sm text-gray-600">
                      Time taken: {userAnswer.timeSpent}s
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}