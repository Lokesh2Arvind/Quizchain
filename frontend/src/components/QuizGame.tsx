'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useBackend } from '@/lib/backend-context';

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

interface PayoutReceipt {
  status: 'paid' | 'simulated' | 'failed' | 'skipped';
  asset: string;
  amount: string;
  totalPlayers: number;
  winner: {
    walletAddress: string;
    username: string;
  } | null;
  transactionHash: string | null;
  network: string | null;
  message: string | null;
  simulated: boolean;
  timestamp?: string;
}

interface GameResults {
  rankings: Array<{
    walletAddress?: string;
    address?: string;
    username: string;
    score: number;
    correctAnswers: number;
  }>;
  totalQuestions: number;
  gameTime: number;
  payout?: PayoutReceipt;
}

export default function QuizGame() {
  const { socket, currentRoomId, leaveRoom, getCurrentRoom } = useBackend();
  const { address } = useAccount();
  const [gameState, setGameState] = useState<'waiting' | 'loading' | 'ready' | 'playing' | 'ended'>('waiting');
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
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
      if (Array.isArray(data.rankings)) {
        setLeaderboard(
          data.rankings.map((player) => ({
            username: player.username,
            walletAddress: player.walletAddress || player.address || 'unknown',
            score: player.score,
            correctAnswers: player.correctAnswers,
          }))
        );
      }
    };

    const handleScoreUpdate = (data: any) => {
      console.log('📊 Score update:', data);
      setLeaderboard(data.leaderboard || []);
    };

    socket.on('room:gameStarting', handleGameStarting);
    socket.on('game:ready', handleGameReady);
    socket.on('game:question', handleGameQuestion);
    socket.on('game:ended', handleGameEnded);
    socket.on('game:scoreUpdate', handleScoreUpdate);

    return () => {
      socket.off('room:gameStarting', handleGameStarting);
      socket.off('game:ready', handleGameReady);
      socket.off('game:question', handleGameQuestion);
      socket.off('game:ended', handleGameEnded);
      socket.off('game:scoreUpdate', handleScoreUpdate);
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
    setGameState('waiting');
    setGameMetadata(null);
    setCurrentQuestion(null);
    setGameResults(null);
    leaveRoom();
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
                      key={`${player.walletAddress}-${index}`}
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
    const finalRankings = Array.isArray(gameResults.rankings) ? gameResults.rankings : [];
    const normalizedAddress = address?.toLowerCase() ?? null;
    const winnerEntry = finalRankings[0];
    const winnerAddress = winnerEntry ? (winnerEntry.walletAddress || winnerEntry.address || '').toLowerCase() : null;
    const participantEntry = normalizedAddress
      ? finalRankings.find((player) => {
          const playerAddress = (player.walletAddress || player.address || '').toLowerCase();
          return playerAddress === normalizedAddress;
        })
      : undefined;
    const userIsWinner = Boolean(normalizedAddress && winnerAddress && normalizedAddress === winnerAddress);
    const outcomeVariant = userIsWinner ? 'winner' : participantEntry ? 'participant' : 'spectator';
    const bannerTitle = outcomeVariant === 'winner' ? "Congrats, you're the champion! 🎉" : outcomeVariant === 'participant' ? 'Better luck next time! 💪' : 'Match complete';
    const bannerSubtitle = outcomeVariant === 'winner'
      ? 'You topped the leaderboard and claimed the pot. Bask in the glory!'
      : outcomeVariant === 'participant'
        ? 'Shake it off—the rematch is waiting and the leaderboard is wide open.'
        : 'Review the final standings below to see how the arena resolved.';
    const bannerClass = outcomeVariant === 'winner'
      ? 'border-emerald-400/70 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-emerald-400/15 text-emerald-100'
      : outcomeVariant === 'participant'
        ? 'border-amber-400/70 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-400/15 text-amber-100'
        : 'border-slate-500/50 bg-slate-900/70 text-slate-200';

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className={`mb-8 rounded-3xl border px-6 py-5 shadow-[0_30px_90px_-50px_rgba(34,211,238,0.45)] backdrop-blur ${bannerClass}`}>
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{bannerTitle}</h3>
          <p className="mt-2 text-sm text-white/80 sm:text-base">{bannerSubtitle}</p>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-yellow-500 mb-2">Game Over! 🎉</h2>
          <p className="text-gray-400">
            Completed {gameResults.totalQuestions} questions in {Math.floor(gameResults.gameTime / 60)}m {gameResults.gameTime % 60}s
          </p>
        </div>

        {/* Rankings */}
        <div className="bg-gray-800 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">🏆 Final Rankings</h3>
          
          <div className="space-y-4">
            {gameResults.rankings.map((player, index) => {
              const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
              const resolvedAddress = player.walletAddress || player.address || '';
              
              return (
                <div
                  key={resolvedAddress || `${player.username}-${index}`}
                  className={`
                    flex items-center justify-between p-6 rounded-xl
                    ${index === 0 ? 'bg-linear-to-r from-yellow-600 to-yellow-500' : 'bg-gray-700'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{medalEmoji}</div>
                    <div>
                      <div className="font-bold text-lg">{player.username}</div>
                      <div className={index === 0 ? 'text-yellow-200' : 'text-gray-400'}>
                        {resolvedAddress
                          ? `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`
                          : 'Address unavailable'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold">{player.score}</div>
                    <div className={index === 0 ? 'text-yellow-200' : 'text-gray-400'}>
                      {player.correctAnswers}/{gameResults.totalQuestions} correct
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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

        {gameResults.payout && (
          <div className="bg-gray-900 rounded-xl p-8 mt-6 border border-yellow-600/30">
            <h3 className="text-2xl font-bold text-yellow-500 mb-4 text-center">💸 Instant Payout</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center justify-center gap-2 text-lg">
                <span className="text-3xl">{gameResults.payout.status === 'paid' ? '⚡' : gameResults.payout.status === 'failed' ? '⚠️' : 'ℹ️'}</span>
                <span>
                  {gameResults.payout.status === 'paid'
                    ? 'Prize pool transferred on-chain to the champion!'
                    : gameResults.payout.status === 'failed'
                      ? 'Payout encountered an issue. Manual review required.'
                      : 'Payout simulated for this demo environment.'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 bg-gray-800/60 rounded-xl p-4">
                <div>
                  <span className="text-gray-400 block text-sm">Winner</span>
                  <span className="font-semibold text-white">{gameResults.payout.winner?.username || 'Unknown player'}</span>
                  <div className="text-xs text-gray-500 break-all">
                    {gameResults.payout.winner?.walletAddress
                      ? `${gameResults.payout.winner.walletAddress.slice(0, 6)}...${gameResults.payout.winner.walletAddress.slice(-4)}`
                      : 'Address unavailable'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 block text-sm">Total Pot</span>
                  <span className="font-semibold text-white">{gameResults.payout.amount} {gameResults.payout.asset}</span>
                  <div className="text-xs text-gray-500">{gameResults.payout.totalPlayers} players × entry fee</div>
                </div>
                <div>
                  <span className="text-gray-400 block text-sm">Status</span>
                  <span className={`font-semibold ${gameResults.payout.status === 'paid' ? 'text-green-400' : gameResults.payout.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {gameResults.payout.status.toUpperCase()}
                  </span>
                  {gameResults.payout.message && (
                    <div className="text-xs text-gray-500 mt-1">{gameResults.payout.message}</div>
                  )}
                </div>
                <div>
                  <span className="text-gray-400 block text-sm">Network</span>
                  <span className="font-semibold text-white">{gameResults.payout.network || 'Not configured'}</span>
                  {gameResults.payout.transactionHash && (
                    <div className="text-xs text-gray-500 break-all mt-1">
                      Tx: {gameResults.payout.transactionHash.slice(0, 10)}...{gameResults.payout.transactionHash.slice(-6)}
                    </div>
                  )}
                </div>
              </div>

              {gameResults.payout.simulated && (
                <div className="text-sm text-yellow-400 text-center">
                  Configure payout credentials on the backend to enable live on-chain settlements.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}