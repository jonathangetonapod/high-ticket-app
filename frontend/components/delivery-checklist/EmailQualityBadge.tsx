'use client'

import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Shield, Zap } from 'lucide-react'
import { EmailAnalysis, getScoreColor, getScoreLabel } from '@/lib/email-analysis'

interface ScoreMeterProps {
  score: number
  label: string
  size?: 'sm' | 'md'
}

export function ScoreMeter({ score, label, size = 'md' }: ScoreMeterProps) {
  const colors = getScoreColor(score)
  const width = size === 'sm' ? 'w-24' : 'w-32'
  const height = size === 'sm' ? 'h-2' : 'h-3'
  
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
      <div className={`${width} ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${colors.text}`}>{score}</span>
    </div>
  )
}

interface EmailQualityAnalysisProps {
  analysis: EmailAnalysis
  isExpanded: boolean
  onToggle: () => void
  isFirstEmail?: boolean
}

export function EmailQualityAnalysis({ 
  analysis, 
  isExpanded, 
  onToggle,
  isFirstEmail = true
}: EmailQualityAnalysisProps) {
  const overallColors = getScoreColor(analysis.overallScore)
  const spamColors = getScoreColor(analysis.spam.score)
  const subjectColors = getScoreColor(analysis.subject.score)
  
  return (
    <div className="mt-3 border rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Email Quality Analysis</span>
          <span className={`text-xs px-2 py-0.5 rounded ${overallColors.bg} ${overallColors.text} font-bold`}>
            {analysis.overallScore}/100
          </span>
          <span className={`text-xs ${overallColors.text}`}>
            {getScoreLabel(analysis.overallScore)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t bg-gray-50/50">
          {/* Subject Line Analysis - Only for first email */}
          {isFirstEmail && (
            <div className="pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} className="text-purple-500" />
                <span className="text-xs font-semibold text-gray-700">Subject Line</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${subjectColors.bg} ${subjectColors.text} font-medium`}>
                  {analysis.subject.score}/100
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${analysis.subject.hasPersonalization ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-gray-600">Personalization</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${analysis.subject.hasPowerWords ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-gray-600">Power Words</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${!analysis.subject.hasAllCaps ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-gray-600">No ALL CAPS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${analysis.subject.length >= 20 && analysis.subject.length <= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-gray-600">Length ({analysis.subject.length} chars)</span>
                </div>
              </div>
              
              {analysis.subject.issues.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <p className="text-xs font-medium text-red-700 mb-1">Issues:</p>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {analysis.subject.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            
              {analysis.subject.suggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs font-medium text-blue-700 mb-1">Suggestions:</p>
                  <ul className="text-xs text-blue-600 space-y-0.5">
                    {analysis.subject.suggestions.map((sug, i) => (
                      <li key={i}>• {sug}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Spam Analysis */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={12} className="text-orange-500" />
              <span className="text-xs font-semibold text-gray-700">Spam Score</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${spamColors.bg} ${spamColors.text} font-medium`}>
                {analysis.spam.score}/100
              </span>
              <span className="text-xs text-gray-500">(100 = clean)</span>
            </div>
            
            {analysis.spam.spamWordsFound.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="text-xs font-medium text-amber-700 mb-1">
                  Spam trigger words found ({analysis.spam.spamWordsFound.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.spam.spamWordsFound.map((match, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 border border-red-200"
                    >
                      {match.word}
                      {match.count > 1 && <span className="ml-1 text-red-500">×{match.count}</span>}
                      <span className="ml-1 text-red-400 text-[10px]">
                        ({match.locations.join(', ')})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle size={12} />
                  No spam trigger words detected!
                </p>
              </div>
            )}
            
            {analysis.spam.warnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-600 space-y-0.5">
                {analysis.spam.warnings.map((warning, i) => (
                  <p key={i} className="flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
