import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTokenAmount(amount: string, decimals: number = 6): string {
  const num = parseInt(amount) / Math.pow(10, decimals)
  return num.toFixed(2)
}

export function calculateScore(correctAnswers: number, totalQuestions: number): number {
  return Math.round((correctAnswers / totalQuestions) * 100)
}

export function getTimeUntilStart(startTime: string): number {
  const now = new Date().getTime()
  const start = new Date(startTime).getTime()
  return Math.max(0, Math.floor((start - now) / 1000))
}

export function isQuizStarted(startTime: string): boolean {
  return new Date().getTime() >= new Date(startTime).getTime()
}

export function isQuizEnded(endTime: string): boolean {
  return new Date().getTime() >= new Date(endTime).getTime()
}