// Email Quality Analysis - Spam Detection & Subject Line Scoring

// Spam word detection - common trigger words that hurt deliverability
const SPAM_WORDS = [
  'free', 'guarantee', 'act now', 'limited time', 'urgent', 'winner',
  'congratulations', 'click here', 'buy now', 'order now', 'special offer',
  'risk free', 'no obligation', 'cash', 'earn money', 'make money',
  'income', 'profit', 'credit card', 'discount', 'save big', 'lowest price',
  '100%', 'amazing', 'incredible', 'unbelievable', 'miracle', 'exclusive deal',
  'double your', 'million dollars', 'opportunity', 'no cost', 'apply now',
  'call now', 'don\'t delete', 'don\'t miss', 'exclusive offer', 'for free',
  'great offer', 'increase sales', 'limited offer', 'money back', 'no catch',
  'no fees', 'no gimmick', 'no strings attached', 'offer expires', 'once in a lifetime',
  'order today', 'promise you', 'risk-free', 'satisfaction guaranteed', 'special promotion',
  'take action', 'this isn\'t spam', 'winner', 'you have been selected', 'you\'re a winner'
]

// Power words that improve open rates
const POWER_WORDS = [
  'discover', 'secret', 'proven', 'results', 'exclusive', 'insider',
  'breakthrough', 'unlock', 'revealed', 'transform', 'boost', 'accelerate',
  'maximize', 'optimize', 'essential', 'critical', 'important', 'quick',
  'easy', 'simple', 'powerful', 'effective', 'successful', 'strategy',
  'growth', 'scale', 'leverage', 'opportunity', 'insight', 'trend'
]

export interface SpamWordMatch {
  word: string
  count: number
  locations: ('subject' | 'body')[]
}

export interface SpamAnalysis {
  score: number // 0-100 (100 = clean, 0 = very spammy)
  spamWordsFound: SpamWordMatch[]
  warnings: string[]
}

export interface SubjectLineAnalysis {
  score: number // 0-100
  length: number
  hasPersonalization: boolean // {{first_name}} etc
  hasPowerWords: boolean
  powerWordsFound: string[]
  hasEmoji: boolean
  hasAllCaps: boolean
  allCapsWords: string[]
  issues: string[]
  suggestions: string[]
}

export interface EmailAnalysis {
  spam: SpamAnalysis
  subject: SubjectLineAnalysis
  overallScore: number
}

/**
 * Find spam words in text and return matches with count
 */
function findSpamWords(text: string, location: 'subject' | 'body'): Map<string, SpamWordMatch> {
  const matches = new Map<string, SpamWordMatch>()
  const lowerText = text.toLowerCase()
  
  for (const spamWord of SPAM_WORDS) {
    // Use word boundary matching for accurate detection
    const regex = new RegExp(`\\b${spamWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const found = lowerText.match(regex)
    
    if (found && found.length > 0) {
      const existing = matches.get(spamWord)
      if (existing) {
        existing.count += found.length
        if (!existing.locations.includes(location)) {
          existing.locations.push(location)
        }
      } else {
        matches.set(spamWord, {
          word: spamWord,
          count: found.length,
          locations: [location]
        })
      }
    }
  }
  
  return matches
}

/**
 * Analyze text for spam words
 */
export function analyzeSpamWords(text: string, location: 'subject' | 'body' = 'body'): SpamAnalysis {
  const matches = findSpamWords(text, location)
  const spamWordsFound = Array.from(matches.values())
  
  // Calculate score - start at 100, deduct points per spam word
  // Subject line spam words are weighted more heavily
  let deductions = 0
  for (const match of spamWordsFound) {
    const baseDeduction = match.locations.includes('subject') ? 8 : 4
    deductions += baseDeduction * match.count
  }
  
  const score = Math.max(0, 100 - deductions)
  
  // Generate warnings
  const warnings: string[] = []
  
  if (spamWordsFound.length > 0) {
    const subjectSpam = spamWordsFound.filter(m => m.locations.includes('subject'))
    const bodySpam = spamWordsFound.filter(m => m.locations.includes('body'))
    
    if (subjectSpam.length > 0) {
      warnings.push(`${subjectSpam.length} spam trigger word${subjectSpam.length > 1 ? 's' : ''} in subject line`)
    }
    if (bodySpam.length >= 3) {
      warnings.push(`High spam word density in body (${bodySpam.length} words)`)
    }
  }
  
  if (score < 50) {
    warnings.push('Email may be flagged by spam filters')
  } else if (score < 70) {
    warnings.push('Consider reducing spam trigger words')
  }
  
  return {
    score,
    spamWordsFound,
    warnings
  }
}

/**
 * Analyze subject line quality
 */
export function analyzeSubjectLine(subject: string): SubjectLineAnalysis {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100
  
  // Length analysis
  const length = subject.length
  if (length === 0) {
    issues.push('Subject line is empty')
    score -= 50
  } else if (length < 20) {
    issues.push('Subject line may be too short')
    suggestions.push('Aim for 30-50 characters for optimal open rates')
    score -= 10
  } else if (length > 60) {
    issues.push('Subject line may get truncated on mobile')
    suggestions.push('Keep subject under 50 characters for mobile visibility')
    score -= 15
  }
  
  // Personalization check (merge fields)
  const personalizationPatterns = [
    /\{\{?\s*(first_?name|firstname|name)\s*\}?\}/i,
    /\{first_?name\}/i,
    /\[first_?name\]/i,
    /%first_?name%/i
  ]
  const hasPersonalization = personalizationPatterns.some(p => p.test(subject))
  if (hasPersonalization) {
    score += 5 // Bonus for personalization
  } else {
    suggestions.push('Consider adding personalization (e.g., {{first_name}})')
  }
  
  // Power words check
  const lowerSubject = subject.toLowerCase()
  const powerWordsFound = POWER_WORDS.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerSubject)
  })
  const hasPowerWords = powerWordsFound.length > 0
  if (!hasPowerWords) {
    suggestions.push('Add a power word to increase engagement')
  }
  
  // Emoji check
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
  const hasEmoji = emojiRegex.test(subject)
  // Emojis can be good or bad depending on audience - neutral
  
  // ALL CAPS check
  const words = subject.split(/\s+/).filter(w => w.length > 2)
  const allCapsWords = words.filter(word => {
    // Ignore merge fields and common acronyms
    if (/\{.*\}/.test(word) || /^\[.*\]$/.test(word)) return false
    return word === word.toUpperCase() && /[A-Z]/.test(word)
  })
  const hasAllCaps = allCapsWords.length > 0
  
  if (hasAllCaps) {
    if (allCapsWords.length >= 2) {
      issues.push('Excessive ALL CAPS detected')
      score -= 15
    } else {
      issues.push('ALL CAPS word detected')
      score -= 5
    }
    suggestions.push('Avoid ALL CAPS - it triggers spam filters')
  }
  
  // Check for common spam patterns in subject
  if (/^re:/i.test(subject) || /^fwd:/i.test(subject)) {
    if (!/^re:\s*\{/i.test(subject)) { // Allow if it's a merge field
      issues.push('Fake reply/forward prefix may hurt deliverability')
      score -= 10
    }
  }
  
  // Check for excessive punctuation
  const exclamationCount = (subject.match(/!/g) || []).length
  const questionCount = (subject.match(/\?/g) || []).length
  if (exclamationCount > 1) {
    issues.push('Multiple exclamation marks detected')
    score -= 10
    suggestions.push('Use at most one exclamation mark')
  }
  if (questionCount > 1) {
    issues.push('Multiple question marks detected')
    score -= 5
  }
  
  // Check for spam words in subject
  const spamCheck = analyzeSpamWords(subject, 'subject')
  if (spamCheck.spamWordsFound.length > 0) {
    score -= spamCheck.spamWordsFound.length * 8
    issues.push(`Contains spam trigger word${spamCheck.spamWordsFound.length > 1 ? 's' : ''}: ${spamCheck.spamWordsFound.map(s => s.word).join(', ')}`)
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    length,
    hasPersonalization,
    hasPowerWords,
    powerWordsFound,
    hasEmoji,
    hasAllCaps,
    allCapsWords,
    issues,
    suggestions
  }
}

/**
 * Full email analysis combining spam and subject analysis
 */
export function analyzeEmailCopy(subject: string, body: string): EmailAnalysis {
  // Analyze subject line
  const subjectAnalysis = analyzeSubjectLine(subject)
  
  // Analyze body for spam
  const bodySpamMatches = findSpamWords(body, 'body')
  const subjectSpamMatches = findSpamWords(subject, 'subject')
  
  // Merge spam matches
  const allMatches = new Map<string, SpamWordMatch>()
  
  for (const [word, match] of subjectSpamMatches) {
    allMatches.set(word, { ...match })
  }
  
  for (const [word, match] of bodySpamMatches) {
    const existing = allMatches.get(word)
    if (existing) {
      existing.count += match.count
      if (!existing.locations.includes('body')) {
        existing.locations.push('body')
      }
    } else {
      allMatches.set(word, { ...match })
    }
  }
  
  const spamWordsFound = Array.from(allMatches.values())
  
  // Calculate spam score
  let spamDeductions = 0
  for (const match of spamWordsFound) {
    const subjectWeight = match.locations.includes('subject') ? 8 : 0
    const bodyWeight = match.locations.includes('body') ? 3 : 0
    spamDeductions += (subjectWeight + bodyWeight) * match.count
  }
  
  const spamScore = Math.max(0, 100 - spamDeductions)
  
  // Generate spam warnings
  const warnings: string[] = []
  const subjectSpam = spamWordsFound.filter(m => m.locations.includes('subject'))
  if (subjectSpam.length > 0) {
    warnings.push(`${subjectSpam.length} spam word${subjectSpam.length > 1 ? 's' : ''} in subject`)
  }
  if (spamWordsFound.length >= 5) {
    warnings.push('High overall spam word count')
  }
  if (spamScore < 50) {
    warnings.push('Email likely to be flagged as spam')
  }
  
  // Overall score weighted: 40% subject, 60% spam/body
  const overallScore = Math.round(subjectAnalysis.score * 0.4 + spamScore * 0.6)
  
  return {
    spam: {
      score: spamScore,
      spamWordsFound,
      warnings
    },
    subject: subjectAnalysis,
    overallScore
  }
}

/**
 * Highlight spam words in text by wrapping them with a marker
 * Returns the text with spam words wrapped in special markers for rendering
 */
export function getSpamWordPositions(text: string): { word: string; start: number; end: number }[] {
  const positions: { word: string; start: number; end: number }[] = []
  const lowerText = text.toLowerCase()
  
  for (const spamWord of SPAM_WORDS) {
    const regex = new RegExp(`\\b${spamWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      positions.push({
        word: spamWord,
        start: match.index,
        end: match.index + match[0].length
      })
    }
  }
  
  // Sort by position
  return positions.sort((a, b) => a.start - b.start)
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 80) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' }
  } else if (score >= 60) {
    return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' }
  } else {
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
  }
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Fair'
  if (score >= 50) return 'Needs Work'
  return 'Poor'
}
