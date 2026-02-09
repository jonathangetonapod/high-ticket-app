'use client'

import { useState, useEffect } from 'react'
import { Check, X, Sparkles, AlertTriangle, Info, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineSuggestionItem } from './types'

interface InlineSuggestionProps {
  suggestion: InlineSuggestionItem
  onApply: (suggestion: InlineSuggestionItem) => void
  onDismiss: (suggestion: InlineSuggestionItem) => void
}

// Compute a simple diff between original and suggested text
function computeDiff(original: string, suggested: string): { type: 'removed' | 'added' | 'same'; text: string }[] {
  // Simple word-level diff for display
  const originalWords = original.split(/(\s+)/)
  const suggestedWords = suggested.split(/(\s+)/)
  
  const diff: { type: 'removed' | 'added' | 'same'; text: string }[] = []
  
  // Find common prefix
  let prefixLen = 0
  while (
    prefixLen < originalWords.length && 
    prefixLen < suggestedWords.length && 
    originalWords[prefixLen] === suggestedWords[prefixLen]
  ) {
    diff.push({ type: 'same', text: originalWords[prefixLen] })
    prefixLen++
  }
  
  // Find common suffix
  let suffixLen = 0
  while (
    suffixLen < originalWords.length - prefixLen && 
    suffixLen < suggestedWords.length - prefixLen && 
    originalWords[originalWords.length - 1 - suffixLen] === suggestedWords[suggestedWords.length - 1 - suffixLen]
  ) {
    suffixLen++
  }
  
  // Middle parts are different
  const originalMiddle = originalWords.slice(prefixLen, originalWords.length - suffixLen)
  const suggestedMiddle = suggestedWords.slice(prefixLen, suggestedWords.length - suffixLen)
  
  if (originalMiddle.length > 0) {
    diff.push({ type: 'removed', text: originalMiddle.join('') })
  }
  if (suggestedMiddle.length > 0) {
    diff.push({ type: 'added', text: suggestedMiddle.join('') })
  }
  
  // Add suffix
  for (let i = originalWords.length - suffixLen; i < originalWords.length; i++) {
    diff.push({ type: 'same', text: originalWords[i] })
  }
  
  return diff
}

export function InlineSuggestion({ suggestion, onApply, onDismiss }: InlineSuggestionProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(suggestion.applied || false)
  const [isDismissed, setIsDismissed] = useState(suggestion.dismissed || false)
  const [showDiff, setShowDiff] = useState(true)

  // Reset state when suggestion changes
  useEffect(() => {
    setIsApplied(suggestion.applied || false)
    setIsDismissed(suggestion.dismissed || false)
  }, [suggestion.applied, suggestion.dismissed])

  if (isDismissed) {
    return null
  }

  const handleApply = async () => {
    setIsApplying(true)
    
    // Simulate a tiny delay for the animation
    await new Promise(resolve => setTimeout(resolve, 300))
    
    onApply(suggestion)
    setIsApplied(true)
    setIsApplying(false)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss(suggestion)
  }

  const diff = computeDiff(suggestion.original, suggestion.suggested)

  const severityStyles = {
    error: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      icon: <AlertTriangle size={14} className="text-red-500" />,
      badge: 'bg-red-100 text-red-700'
    },
    warning: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      icon: <AlertTriangle size={14} className="text-amber-500" />,
      badge: 'bg-amber-100 text-amber-700'
    },
    suggestion: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      icon: <Info size={14} className="text-blue-500" />,
      badge: 'bg-blue-100 text-blue-700'
    }
  }

  const style = severityStyles[suggestion.severity]

  if (isApplied) {
    return (
      <div className={`
        rounded-lg border border-emerald-200 bg-emerald-50 p-3
        transform transition-all duration-500 ease-out
        animate-in fade-in slide-in-from-top-2
      `}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in duration-300">
            <Check size={14} className="text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-emerald-700">Fix applied!</span>
          <span className="text-xs text-emerald-600 ml-auto">
            {suggestion.type === 'subject' ? 'Subject line' : 'Body copy'} updated
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`
      rounded-lg border ${style.border} ${style.bg} p-3 space-y-3
      transform transition-all duration-300 ease-out
      hover:shadow-md
      animate-in fade-in slide-in-from-top-2
    `}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-shrink-0">
            <Wand2 size={16} className="text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
                {suggestion.severity === 'error' ? '🚨 Must fix' : suggestion.severity === 'warning' ? '⚠️ Should fix' : '💡 Suggestion'}
              </span>
              <span className="text-xs text-gray-500 capitalize">
                {suggestion.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1 leading-snug">
              {suggestion.message}
            </p>
          </div>
        </div>
      </div>

      {/* Diff View */}
      {showDiff && (
        <div className="space-y-2">
          {/* Original */}
          <div className="rounded border border-red-200 bg-white p-2">
            <div className="flex items-center gap-1 mb-1">
              <X size={10} className="text-red-400" />
              <span className="text-[10px] uppercase tracking-wide text-red-500 font-medium">Original</span>
            </div>
            <p className="text-sm text-gray-700 font-mono bg-red-50 px-2 py-1 rounded line-through decoration-red-300">
              {suggestion.original}
            </p>
          </div>

          {/* Suggested */}
          <div className="rounded border border-emerald-200 bg-white p-2">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles size={10} className="text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wide text-emerald-500 font-medium">Suggested</span>
            </div>
            <p className="text-sm text-gray-700 font-mono bg-emerald-50 px-2 py-1 rounded">
              {suggestion.suggested}
            </p>
          </div>

          {/* Inline Diff Preview */}
          <div className="text-xs text-gray-500 bg-white rounded border border-gray-200 p-2">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium block mb-1">Changes</span>
            <p className="font-mono leading-relaxed">
              {diff.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.type === 'removed'
                      ? 'bg-red-100 text-red-700 line-through'
                      : part.type === 'added'
                        ? 'bg-emerald-100 text-emerald-700'
                        : ''
                  }
                >
                  {part.text}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={isApplying}
          className={`
            flex-1 gap-1.5 h-8 text-xs font-medium
            bg-gradient-to-r from-emerald-500 to-emerald-600 
            hover:from-emerald-600 hover:to-emerald-700
            text-white shadow-sm
            transition-all duration-200
            ${isApplying ? 'animate-pulse' : ''}
          `}
        >
          {isApplying ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Wand2 size={12} />
              Apply Fix
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <X size={12} className="mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  )
}

// Suggestions summary component for showing count
interface SuggestionsSummaryProps {
  total: number
  applied: number
  dismissed: number
}

export function SuggestionsSummary({ total, applied, dismissed }: SuggestionsSummaryProps) {
  const remaining = total - applied - dismissed

  if (total === 0) return null

  return (
    <div className="flex items-center gap-3 text-xs">
      {remaining > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700">
          <Wand2 size={12} />
          {remaining} suggestion{remaining !== 1 ? 's' : ''}
        </span>
      )}
      {applied > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
          <Check size={12} />
          {applied} fixed
        </span>
      )}
    </div>
  )
}
