'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Circle, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: string
  label: string
  status: 'idle' | 'current' | 'complete' | 'warning' | 'error'
}

interface StepProgressProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  const progress = ((currentStep) / (steps.length - 1)) * 100

  return (
    <div className={cn('space-y-4', className)}>
      {/* Step indicator text */}
      <div className="flex items-center justify-between">
        <motion.span
          key={currentStep}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-gray-700"
        >
          Step {currentStep + 1} of {steps.length}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground"
        >
          {steps[currentStep]?.label}
        </motion.span>
      </div>

      {/* Progress bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          {/* Animated progress fill */}
          <motion.div
            className="h-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ 
              type: 'spring', 
              stiffness: 100, 
              damping: 20,
              duration: 0.5 
            }}
          />
        </div>

        {/* Step indicators */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between">
          {steps.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              index={index}
              currentStep={currentStep}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Step labels (desktop) */}
      <div className="hidden sm:flex justify-between text-xs text-muted-foreground">
        {steps.map((step, index) => (
          <motion.span
            key={step.id}
            className={cn(
              'max-w-[80px] text-center transition-colors duration-200',
              index === currentStep && 'text-gray-900 font-medium',
              step.status === 'complete' && 'text-emerald-600',
              step.status === 'error' && 'text-red-600',
              step.status === 'warning' && 'text-amber-600'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {step.label}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

interface StepIndicatorProps {
  step: Step
  index: number
  currentStep: number
  isLast: boolean
}

function StepIndicator({ step, index, currentStep, isLast }: StepIndicatorProps) {
  const isActive = index === currentStep
  const isCompleted = step.status === 'complete'
  const isError = step.status === 'error'
  const isWarning = step.status === 'warning'

  const getIcon = () => {
    if (isCompleted) {
      return <CheckCircle size={16} className="text-white" />
    }
    if (isError) {
      return <XCircle size={16} className="text-white" />
    }
    if (isWarning) {
      return <AlertTriangle size={16} className="text-white" />
    }
    return <span className="text-xs font-semibold">{index + 1}</span>
  }

  const getBackgroundColor = () => {
    if (isCompleted) return 'bg-emerald-500'
    if (isError) return 'bg-red-500'
    if (isWarning) return 'bg-amber-500'
    if (isActive) return 'bg-gray-900'
    return 'bg-gray-200'
  }

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300',
        getBackgroundColor(),
        isActive && 'ring-4 ring-gray-900/20',
        isCompleted && 'ring-4 ring-emerald-500/20',
        isError && 'ring-4 ring-red-500/20',
        isWarning && 'ring-4 ring-amber-500/20',
        !isActive && !isCompleted && !isError && !isWarning && 'text-gray-400'
      )}
      initial={{ scale: 0.8 }}
      animate={{ 
        scale: isActive ? 1.1 : 1,
      }}
      whileHover={{ scale: 1.15 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'flex items-center justify-center',
          isActive || isCompleted || isError || isWarning ? 'text-white' : 'text-gray-400'
        )}
      >
        {getIcon()}
      </motion.div>

      {/* Pulse animation for active step */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gray-900"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: 'easeOut' 
          }}
        />
      )}
    </motion.div>
  )
}
