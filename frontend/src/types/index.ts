// Quiz Game Types
export interface Quiz {
  id: string
  title: string
  description: string
  host: string
  questions: Question[]
  prizePool: number
  entryFee: number
  startTime: string
  endTime: string
  maxParticipants: number
  currentParticipants: number
  participants: string[]
  status: 'upcoming' | 'active' | 'finished'
}

export interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  timeLimit: number // seconds
}

export interface UserAnswer {
  questionId: string
  selectedAnswer: number
  timeSpent: number
  isCorrect: boolean
}

export interface QuizSession {
  id: string
  quizId: string
  participantAddress: string
  answers: UserAnswer[]
  score: number
  rank: number
  startTime: string
  endTime?: string
  status: 'waiting' | 'active' | 'completed'
}

export interface QuizResult {
  sessionId: string
  participantAddress: string
  score: number
  rank: number
  correctAnswers: number
  totalQuestions: number
  timeSpent: number
  prizeWon: number
}

export interface GameResults {
  rankings: Array<{
    username: string
    walletAddress: string
    score: number
    correctAnswers: number
  }>
  totalQuestions: number
  gameTime: number
  prizePool?: number
  asset?: string
}

// Yellow SDK Types
export interface YellowConfig {
  clearNodeUrl: string
  contractAddresses: {
    custody: string
    adjudicator: string
    token: string
  }
  chainId: number
}

export interface AppDefinition {
  protocol: string
  participants: string[]
  weights: number[]
  quorum: number
  challenge: number
  nonce: number
}

export interface AppAllocation {
  participant: string
  asset: string
  amount: string
}

export interface AppSession {
  definition: AppDefinition
  allocations: AppAllocation[]
}

export interface StateUpdate {
  sessionId: string
  intent: 'operate' | 'deposit' | 'withdraw' | 'close'
  version: number
  allocations: AppAllocation[]
}

// UI State Types
export interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  balance: string
}

export interface YellowState {
  isConnected: boolean
  sessionId: string | null
  balance: string
  error: string | null
}

export interface GameState {
  currentQuiz: Quiz | null
  currentQuestion: Question | null
  questionIndex: number
  timeRemaining: number
  userAnswers: UserAnswer[]
  score: number
  isGameActive: boolean
}