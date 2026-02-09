'use client'

import { useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiOptions {
  /** Duration of the burst in ms */
  duration?: number
  /** Number of confetti pieces */
  particleCount?: number
  /** Spread angle in degrees */
  spread?: number
  /** Starting Y position (0-1) */
  startY?: number
  /** Colors to use */
  colors?: string[]
}

export function useConfetti() {
  const animationRef = useRef<number | null>(null)

  // Standard celebration burst
  const celebrate = useCallback((options: ConfettiOptions = {}) => {
    const {
      duration = 2500,
      particleCount = 100,
      spread = 70,
      startY = 0.6,
      colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']
    } = options

    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: spread,
        origin: { x: 0, y: startY },
        colors: colors,
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle', 'square'],
        scalar: 1.2
      })
      
      confetti({
        particleCount: 3,
        angle: 120,
        spread: spread,
        origin: { x: 1, y: startY },
        colors: colors,
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle', 'square'],
        scalar: 1.2
      })

      if (Date.now() < end) {
        animationRef.current = requestAnimationFrame(frame)
      }
    }

    frame()
  }, [])

  // Quick burst (for smaller wins)
  const burst = useCallback((options: ConfettiOptions = {}) => {
    const {
      particleCount = 50,
      spread = 60,
      colors = ['#10b981', '#3b82f6', '#6366f1']
    } = options

    confetti({
      particleCount,
      spread,
      origin: { x: 0.5, y: 0.5 },
      colors,
      ticks: 150,
      gravity: 1.5,
      decay: 0.9,
      startVelocity: 25,
      shapes: ['circle'],
      scalar: 0.9
    })
  }, [])

  // Firework effect
  const fireworks = useCallback((options: ConfettiOptions = {}) => {
    const { duration = 3000 } = options
    const end = Date.now() + duration

    const colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899']

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: colors,
        ticks: 300,
        gravity: 1,
        decay: 0.93,
        scalar: 1.2,
        shapes: ['circle']
      })

      if (Date.now() < end) {
        animationRef.current = requestAnimationFrame(frame)
      }
    }

    frame()
  }, [])

  // Cannon burst (shoots from a point)
  const cannon = useCallback((angle: number = 90, options: ConfettiOptions = {}) => {
    const {
      particleCount = 80,
      spread = 45,
      colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6']
    } = options

    confetti({
      particleCount,
      angle,
      spread,
      origin: { 
        x: angle < 90 ? 0 : angle > 90 ? 1 : 0.5, 
        y: 0.9 
      },
      colors,
      ticks: 250,
      gravity: 1.2,
      decay: 0.92,
      startVelocity: 45,
      shapes: ['circle', 'square'],
      scalar: 1
    })
  }, [])

  // Success celebration (tasteful, 2-3 second burst)
  const success = useCallback(() => {
    // Initial cannon shots from both sides
    cannon(60)
    setTimeout(() => cannon(120), 200)
    
    // Followed by center burst
    setTimeout(() => {
      burst({ particleCount: 70 })
    }, 400)

    // Final sparkle
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#10b981', '#34d399'],
        ticks: 200,
        gravity: 0.8,
        decay: 0.9,
        startVelocity: 20,
        shapes: ['circle'],
        scalar: 0.8
      })
    }, 700)
  }, [burst, cannon])

  // Clean up any running animations
  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    confetti.reset()
  }, [])

  return {
    celebrate,
    burst,
    fireworks,
    cannon,
    success,
    stop
  }
}
