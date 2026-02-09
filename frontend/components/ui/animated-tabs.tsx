'use client'

import { ReactNode, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedTabContentProps {
  children: ReactNode
  tabKey: string
  direction?: 'forward' | 'backward'
  className?: string
}

// Sliding tab content with direction awareness
export function AnimatedTabContent({ 
  children, 
  tabKey, 
  direction = 'forward',
  className 
}: AnimatedTabContentProps) {
  const xOffset = direction === 'forward' ? 40 : -40

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: xOffset }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -xOffset }}
        transition={{ 
          type: 'spring',
          stiffness: 300,
          damping: 30,
          duration: 0.3
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Fade-only tab content for simpler transitions
export function FadeTabContent({ 
  children, 
  tabKey, 
  className 
}: Omit<AnimatedTabContentProps, 'direction'>) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Hook to track tab direction
export function useTabDirection(currentTab: string, tabs: string[]) {
  const prevTabRef = useRef(currentTab)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    const prevIndex = tabs.indexOf(prevTabRef.current)
    const currentIndex = tabs.indexOf(currentTab)
    
    if (currentIndex > prevIndex) {
      setDirection('forward')
    } else if (currentIndex < prevIndex) {
      setDirection('backward')
    }
    
    prevTabRef.current = currentTab
  }, [currentTab, tabs])

  return direction
}

// Animated validation badge
interface ValidationBadgeProps {
  status: 'idle' | 'validating' | 'pass' | 'fail' | 'warning'
  className?: string
}

export function ValidationBadge({ status, className }: ValidationBadgeProps) {
  if (status === 'idle') return null

  const variants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(
          'flex items-center justify-center',
          className
        )}
      >
        {status === 'validating' && (
          <motion.div
            className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {status === 'pass' && (
          <motion.svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-emerald-500"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.path
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          </motion.svg>
        )}
        {status === 'fail' && (
          <motion.div className="w-4 h-4 text-red-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        )}
        {status === 'warning' && (
          <motion.div className="w-4 h-4 text-amber-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Animated button with hover effects
interface AnimatedButtonProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'danger'
  isLoading?: boolean
  loadingText?: string
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function AnimatedButton({ 
  children, 
  variant = 'default',
  isLoading,
  loadingText,
  className,
  disabled,
  onClick,
  type = 'button'
}: AnimatedButtonProps) {
  const baseStyles = 'relative overflow-hidden rounded-lg font-medium transition-colors'
  
  const variantStyles = {
    default: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    primary: 'bg-gray-900 text-white hover:bg-gray-800',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  }

  return (
    <motion.button
      type={type}
      className={cn(baseStyles, variantStyles[variant], className)}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      <motion.span
        className="relative z-10 flex items-center justify-center gap-2"
        animate={{ opacity: isLoading ? 0.7 : 1 }}
      >
        {isLoading ? (
          <>
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </motion.span>
      
      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
        whileHover={{ translateX: '100%' }}
        transition={{ duration: 0.5 }}
      />
    </motion.button>
  )
}

// Progress ring animation (for validate all)
interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 4,
  className 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <motion.svg
      width={size}
      height={size}
      className={cn('transform -rotate-90', className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-emerald-500"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          strokeDasharray: circumference,
        }}
      />
    </motion.svg>
  )
}
