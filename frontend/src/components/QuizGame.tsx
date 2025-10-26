'use client';

import { useEffect, useState } from 'react';
import { useBackend } from '@/lib/backend-context';

interface QuizGameProps {
  onLeaveGame?: () => void;
}

interface Question {
  questionNumber: number;
  totalQuestions: number;
  question: string;
  options: string[];
  timeLimit: number;
  points: number;
  topic: string;
}

interface GameMetadata {
  totalQuestions: number;
  timePerQuestion: number;
  pointsPerQuestion: number;
  difficulty: string;
  topic: string;
}

interface GameResults {
  rankings: Array<{
    address: string;
    username: string;
    score: number;
    correctAnswers: number;
  }>;
  totalQuestions: number;
  gameTime: number;
  prizePool?: number;
  asset?: string;
}

export default function QuizGame({ onLeaveGame }: QuizGameProps = {}) {
  const { socket, currentRoomId, leaveRoom, getCurrentRoom } = useBackend();
  const [gameState, setGameState] = useState<'waiting' | 'loading' | 'ready' | 'playing' | 'ended'>('waiting');
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading questions...');
  const [leaderboard, setLeaderboard] = useState<Array<{username: string, walletAddress: string, score: number, correctAnswers: number}>>([]);
  const [showFeedback, setShowFeedback] = useState<{show: boolean, isCorrect: boolean, score: number} | null>(null);

  // Fetch current room data
  useEffect(() => {
    const loadRoom = async () => {
      if (currentRoomId) {
        const result = await getCurrentRoom();
        if (result.success && result.room) {
          setRoomCode(result.room.code);
        }
      }
    };
    loadRoom();
  }, [currentRoomId, getCurrentRoom]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing' || !currentQuestion) return;

    setTimeRemaining(currentQuestion.timeLimit);
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit or move to next question
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, gameState]);

  // Listen for game events
  useEffect(() => {
    if (!socket) return;

    const handleGameStarting = (data: any) => {
      console.log('🎮 Game starting, loading questions...', data);
      setGameState('loading');
      setLoadingMessage(data.message || 'Loading questions...');
    };

    const handleGameReady = (data: GameMetadata) => {
      console.log('🎮 Game ready:', data);
      setGameMetadata(data);
      setGameState('ready');
    };

    const handleGameQuestion = (data: Question) => {
      console.log('❓ New question:', data);
      console.log('📋 Options received:', data.options);
      console.log('📊 Options count:', data.options?.length);
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setGameState('playing');
    };

    const handleGameEnded = (data: GameResults) => {
      console.log('🏁 Game ended:', data);
      setGameResults(data);
      setGameState('ended');
      setCurrentQuestion(null);
    };

    const handleScoreUpdate = (data: any) => {
      console.log('📊 Score update:', data);
      setLeaderboard(data.leaderboard || []);
    };

    const handlePrizeDistributed = (data: any) => {
      console.log('💰 Prize distributed:', data);
      // Could show a toast notification here
      if (data.winner && data.amount) {
        console.log(`🏆 ${data.winner} won ${data.amount} ${data.asset}!`);
      }
    };

    socket.on('room:gameStarting', handleGameStarting);
    socket.on('game:ready', handleGameReady);
    socket.on('game:question', handleGameQuestion);
    socket.on('game:ended', handleGameEnded);
    socket.on('game:scoreUpdate', handleScoreUpdate);
    socket.on('game:prizeDistributed', handlePrizeDistributed);

    return () => {
      socket.off('room:gameStarting', handleGameStarting);
      socket.off('game:ready', handleGameReady);
      socket.off('game:question', handleGameQuestion);
      socket.off('game:ended', handleGameEnded);
      socket.off('game:scoreUpdate', handleScoreUpdate);
      socket.off('game:prizeDistributed', handlePrizeDistributed);
    };
  }, [socket]);

  const handleAnswerSelect = (optionIndex: number) => {
    if (hasSubmitted || timeRemaining === 0) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || hasSubmitted) return;
    
    setHasSubmitted(true);
    
    // Emit answer to backend (Phase 4)
    if (socket && roomCode && currentQuestion) {
      socket.emit('game:submitAnswer', {
        roomCode: roomCode,
        questionNumber: currentQuestion.questionNumber,
        answer: selectedAnswer,
        timeRemaining,
      }, (response: any) => {
        console.log('Answer response:', response);
        if (response.success) {
          // Show feedback popup
          setShowFeedback({
            show: true,
            isCorrect: response.isCorrect,
            score: response.score,
          });
          
          // Hide feedback after 2 seconds
          setTimeout(() => {
            setShowFeedback(null);
          }, 2000);
        }
      });
    }
  };

  const handleLeaveGame = () => {
    // Reset all game state
    setGameState('waiting');
    setGameMetadata(null);
    setCurrentQuestion(null);
    setGameResults(null);
    
    // Leave the room in backend
    leaveRoom();
    
    // Call parent callback to clear room state and return to lobby
    if (onLeaveGame) {
      onLeaveGame();
    }
  };

  // Waiting for game to start
  if (gameState === 'waiting') {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Waiting for host to start the game...</p>
      </div>
    );
  }

  // Loading questions
  if (gameState === 'loading') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md mx-4 border-4 border-yellow-500 shadow-2xl">
          <div className="text-center">
            {/* Animated spinner */}
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-yellow-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">🎮</span>
              </div>
            </div>
            
            {/* Loading text */}
            <h2 className="text-2xl font-bold text-yellow-500 mb-3 animate-pulse">
              Starting Game...
            </h2>
            <p className="text-gray-300 text-lg mb-4">{loadingMessage}</p>
            
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            
            <p className="text-gray-500 text-sm">Fetching questions from API...</p>
          </div>
        </div>
      </div>
    );
  }

  // Game ready countdown
  if (gameState === 'ready' && gameMetadata) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-yellow-500 mb-4">Get Ready! 🎯</h2>
        <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-400">Topic:</span>
              <span className="text-white font-bold">{gameMetadata.topic}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Questions:</span>
              <span className="text-white font-bold">{gameMetadata.totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time per Question:</span>
              <span className="text-white font-bold">{gameMetadata.timePerQuestion}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Points per Question:</span>
              <span className="text-white font-bold">{gameMetadata.pointsPerQuestion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Difficulty:</span>
              <span className="text-white font-bold capitalize">{gameMetadata.difficulty}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-400 mt-6 animate-pulse">First question coming soon...</p>
      </div>
    );
  }

  // Active question
  if (gameState === 'playing' && currentQuestion) {
    const getTimerColor = () => {
      if (timeRemaining > 20) return 'text-green-500';
      if (timeRemaining > 10) return 'text-yellow-500';
      return 'text-red-500';
    };

    return (
      <div className="flex gap-6 max-w-7xl mx-auto p-6">
        {/* Yellow Network Info Banner */}
        <div className="fixed top-4 right-4 bg-blue-900 border border-blue-500 rounded-lg p-3 max-w-md z-50">
          <div className="flex items-start gap-2">
            <span className="text-blue-400 text-xl">ℹ️</span>
            <div className="text-sm">
              <p className="text-blue-200 font-semibold mb-1">Yellow Network Info</p>
              <p className="text-gray-300 text-xs">
                If Yellow disconnects during gameplay, don't worry! Your game session and prize tracking continue on the backend. 
                Prizes are distributed automatically when the game ends.
              </p>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-400">
              Question <span className="text-yellow-500 font-bold">{currentQuestion.questionNumber}</span> of {currentQuestion.totalQuestions}
            </div>
            <div className={`text-3xl font-bold ${getTimerColor()}`}>
              {timeRemaining}s
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-gray-800 rounded-xl p-8 mb-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="bg-yellow-500 text-black px-3 py-1 rounded-lg font-bold text-sm">
                {currentQuestion.points} pts
              </div>
              <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm">
                {currentQuestion.topic}
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* Answer Options */}
            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isDisabled = hasSubmitted || timeRemaining === 0;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isDisabled}
                      className={`
                        relative p-6 rounded-xl text-left transition-all duration-200
                        ${isSelected 
                          ? 'bg-yellow-500 text-black border-2 border-yellow-400 shadow-lg scale-105' 
                          : 'bg-gray-700 text-white border-2 border-gray-600 hover:border-yellow-500 hover:bg-gray-600'
                        }
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                          ${isSelected ? 'bg-black text-yellow-500' : 'bg-gray-600 text-white'}
                        `}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div className="flex-1 font-semibold">{option}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 text-center">
                <p className="text-red-500 font-bold">⚠️ No options available</p>
                <p className="text-gray-400 text-sm mt-2">Debug: Check browser console for question data</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            {!hasSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null || timeRemaining === 0}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed
                           text-black font-bold py-4 px-12 rounded-xl text-lg transition-all duration-200
                           disabled:text-gray-400"
              >
                {selectedAnswer === null ? 'Select an Answer' : 'Submit Answer'}
              </button>
            ) : (
              <div className="text-green-500 font-bold text-lg animate-pulse">
                ✅ Answer Submitted! Next question coming...
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div className="w-80">
          <div className="bg-gray-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
              🏆 Leaderboard
            </h3>
            
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((player, index) => {
                  const rank = index + 1;
                  const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                  
                  return (
                    <div
                      key={player.walletAddress}
                      className={`
                        p-4 rounded-lg
                        ${rank === 1 ? 'bg-linear-to-r from-yellow-600 to-yellow-500' : 'bg-gray-700'}
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{medalEmoji}</span>
                          <span className={`font-bold ${rank === 1 ? 'text-black' : 'text-white'}`}>
                            {player.username}
                          </span>
                        </div>
                        <div className={`text-xl font-bold ${rank === 1 ? 'text-black' : 'text-yellow-500'}`}>
                          {player.score}
                        </div>
                      </div>
                      <div className={`text-sm ${rank === 1 ? 'text-black/70' : 'text-gray-400'}`}>
                        ✅ {player.correctAnswers} correct
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                Leaderboard will appear after first answer
              </div>
            )}
          </div>
        </div>

        {/* Answer Feedback Popup */}
        {showFeedback && showFeedback.show && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className={`
              bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center
              transform transition-all duration-300 scale-100
              ${showFeedback.isCorrect ? 'border-4 border-green-500' : 'border-4 border-red-500'}
            `}>
              <div className="text-6xl mb-4">
                {showFeedback.isCorrect ? '✅' : '❌'}
              </div>
              <h3 className={`text-3xl font-bold mb-2 ${showFeedback.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {showFeedback.isCorrect ? 'Correct!' : 'Wrong!'}
              </h3>
              {showFeedback.isCorrect && (
                <div className="text-yellow-500 text-2xl font-bold">
                  +{showFeedback.score} points
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Game ended - Results
  if (gameState === 'ended' && gameResults) {
    const winner = gameResults.rankings[0];
    const currentUserAddress = ''; // Get from wallet context if needed
    const isWinner = winner?.address === currentUserAddress;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-yellow-500 mb-2">Game Over! 🎉</h2>
          <p className="text-gray-400">
            Completed {gameResults.totalQuestions} questions in {Math.floor(gameResults.gameTime / 60)}m {gameResults.gameTime % 60}s
          </p>
        </div>

        {/* Prize Pool Banner */}
        {gameResults.prizePool && gameResults.prizePool > 0 && (
          <div className="bg-linear-to-r from-yellow-600 to-yellow-500 rounded-xl p-6 mb-6 text-center">
            <div className="text-white">
              <div className="text-sm font-semibold mb-2">💰 PRIZE POOL</div>
              <div className="text-4xl font-bold mb-2">
                {gameResults.prizePool} {gameResults.asset || 'USDC'}
              </div>
              <div className="text-yellow-100">
                Winner takes all! 🏆
              </div>
            </div>
          </div>
        )}

        {/* Rankings */}
        <div className="bg-gray-800 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">🏆 Final Rankings</h3>
          
          <div className="space-y-4">
            {gameResults.rankings.map((player, index) => {
              const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
              const isFirstPlace = index === 0;
              
              return (
                <div
                  key={player.address}
                  className={`
                    flex items-center justify-between p-6 rounded-xl
                    ${isFirstPlace ? 'bg-linear-to-r from-yellow-600 to-yellow-500 shadow-lg' : 'bg-gray-700'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{medalEmoji}</div>
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        {player.username}
                        {isFirstPlace && gameResults.prizePool && (
                          <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold">
                            WINNER
                          </span>
                        )}
                      </div>
                      <div className={isFirstPlace ? 'text-yellow-200' : 'text-gray-400'}>
                        {player.address ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold">{player.score}</div>
                    <div className={isFirstPlace ? 'text-yellow-200' : 'text-gray-400'}>
                      {player.correctAnswers}/{gameResults.totalQuestions} correct
                    </div>
                    {isFirstPlace && gameResults.prizePool && (
                      <div className="mt-2 text-yellow-200 font-bold">
                        +{gameResults.prizePool} {gameResults.asset || 'USDC'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Yellow Network Badge */}
          {gameResults.prizePool && gameResults.prizePool > 0 && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg text-center">
              <div className="text-sm text-gray-400 mb-2">
                Prizes distributed instantly via
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-yellow-500 font-bold">Yellow Network</span>
                <span className="text-gray-400 text-xs">(Sepolia Testnet)</span>
              </div>
            </div>
          )}

          {/* Leave Button */}
          <div className="text-center mt-8">
            <button
              onClick={handleLeaveGame}
              className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-8 rounded-xl transition-all"
            >
              Leave Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}