import { NextResponse } from 'next/server'
import { getAllClients } from '@/lib/sheets'

// Operations KPI Google Sheet - Monthly Report tab (gid=1715408545)
const OPS_SHEET_ID = '1AEWdpQc0HuIEK5ke-Jj9hEyze7-evGzfQxnG-mdiSpM'
const OPS_SHEET_GID = '1715408545'

interface OperationsKPI {
  avgDaysToDelivery: number
  avgDaysToTechSetup: number
  avgDaysToSequences: number
  deliveryTrend: 'up' | 'down' | 'flat'
  monthlyData: {
    month: string
    daysToDelivery: number
    daysToTechSetup: number
    daysToSequences: number
  }[]
}

interface MailboxSummary {
  total: number
  healthy: number
  warning: number
  critical: number
  instantly: number
  bison: number
  readyToLaunchPercent: number
}

interface SubmissionStats {
  total: number
  pending: number
  approved: number
  rejected: number
  launched: number
  recentSubmissions: {
    id: string
    clientName: string
    status: string
    submittedAt: string
    platform: string
  }[]
}

interface AtRiskClient {
  id: string
  clientName: string
  platform: string
  daysSinceActivity: number
  hasMailboxIssues: boolean
  lastActivityDate: string
}

interface ClientHealth {
  healthy: number
  needsAttention: number
  atRisk: number
  details: {
    id: string
    clientName: string
    platform: string
    status: 'healthy' | 'attention' | 'atRisk'
    issues: string[]
  }[]
}

interface ActionRequired {
  pendingSubmissions: { count: number; oldestWaitingDays: number; oldestClient: string }
  failingMailboxes: { count: number; clientsAffected: number }
  stuckDeliveries: { count: number; longestWaitingDays: number }
}

interface LongestWaiting {
  clientName: string
  daysWaiting: number
  submittedAt: string
  platform: string
}

interface ClientPerformance {
  clientName: string
  platform: string
  responseRate: number
  totalSent: number
  totalResponses: number
}

interface DeliverySLA {
  withinTargetPercent: number
  targetDays: number
  clientsWaiting: { clientName: string; daysWaiting: number; platform: string }[]
}

// Cache for dashboard data (30 second TTL)
interface CacheEntry {
  data: any
  timestamp: number
}
let dashboardCache: CacheEntry | null = null
const CACHE_TTL = 30 * 1000 // 30 seconds

// Parse CSV text into objects
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values: string[] = []
    let currentValue = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

// Fetch Operations KPIs from Google Sheet
async function fetchOperationsKPIs(): Promise<OperationsKPI> {
  try {
    // Fetch the specific sheet tab using gid
    const csvUrl = `https://docs.google.com/spreadsheets/d/${OPS_SHEET_ID}/export?format=csv&gid=${OPS_SHEET_GID}`
    
    console.log('Fetching operations KPIs from Google Sheet...')

    const response = await fetch(csvUrl, {
      cache: 'no-store',
      headers: { 'Accept': 'text/csv' }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch operations sheet: ${response.status}`)
    }

    const csvText = await response.text()
    console.log('Raw CSV:', csvText.substring(0, 500))
    
    const rows = parseCSV(csvText)
    console.log('Parsed rows:', rows.length)

    // Parse the KPI data - actual column names from the sheet:
    // Month, Avg # of Days Between Client Intake and Delivery, 
    // Avg # of Days Between Client Intake and Tech Setup Submitted,
    // Avg # of Days Between Client Intake and Sequences Sent,
    // Avg number of neg requests, Number of on going management signups
    const monthlyData: OperationsKPI['monthlyData'] = []
    
    for (const row of rows) {
      // Get values by position (more reliable than column names with special chars)
      const values = Object.values(row)
      const month = values[0]?.trim()
      const daysToDelivery = parseFloat(values[1]) || 0
      const daysToTechSetup = parseFloat(values[2]) || 0
      const daysToSequences = parseFloat(values[3]) || 0

      // Only include rows that look like month entries (e.g., "October '25", "Jan '26")
      const monthPattern = /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i
      if (month && monthPattern.test(month)) {
        console.log(`Parsed row: ${month} - Delivery: ${daysToDelivery}, Tech: ${daysToTechSetup}, Seq: ${daysToSequences}`)
        monthlyData.push({
          month: month.trim(), // Keep month as-is from sheet
          daysToDelivery,
          daysToTechSetup,
          daysToSequences
        })
      }
    }

    // If no data found, return fallback message
    if (monthlyData.length === 0) {
      console.log('No valid data rows found in sheet')
      return {
        avgDaysToDelivery: 0,
        avgDaysToTechSetup: 0,
        avgDaysToSequences: 0,
        deliveryTrend: 'flat',
        monthlyData: []
      }
    }

    // Filter out months with no data (all zeros)
    const monthsWithData = monthlyData.filter(m => m.daysToDelivery > 0 || m.daysToTechSetup > 0 || m.daysToSequences > 0)
    
    // Calculate averages from months that have data
    const avgMonths = monthsWithData.slice(-3) // Last 3 months with data
    const avgDaysToDelivery = avgMonths.length > 0 
      ? avgMonths.reduce((sum, m) => sum + m.daysToDelivery, 0) / avgMonths.length 
      : 0
    const avgDaysToTechSetup = avgMonths.length > 0
      ? avgMonths.reduce((sum, m) => sum + m.daysToTechSetup, 0) / avgMonths.length
      : 0
    const avgDaysToSequences = avgMonths.length > 0
      ? avgMonths.reduce((sum, m) => sum + m.daysToSequences, 0) / avgMonths.length
      : 0

    // Calculate trend (comparing last month with data to 2 months before)
    let deliveryTrend: 'up' | 'down' | 'flat' = 'flat'
    if (monthsWithData.length >= 2) {
      const lastMonth = monthsWithData[monthsWithData.length - 1].daysToDelivery
      const previousMonth = monthsWithData[monthsWithData.length - 2].daysToDelivery
      
      if (previousMonth > 0) {
        const change = ((lastMonth - previousMonth) / previousMonth) * 100
        if (change < -10) deliveryTrend = 'down' // Fewer days = improving
        else if (change > 10) deliveryTrend = 'up' // More days = worse
      }
    }
    
    console.log(`Calculated: Avg Delivery=${avgDaysToDelivery}, Trend=${deliveryTrend}, Months with data=${monthsWithData.length}`)

    return {
      avgDaysToDelivery: Math.round(avgDaysToDelivery * 10) / 10,
      avgDaysToTechSetup: Math.round(avgDaysToTechSetup * 10) / 10,
      avgDaysToSequences: Math.round(avgDaysToSequences * 10) / 10,
      deliveryTrend,
      monthlyData
    }
  } catch (error) {
    console.error('Error fetching operations KPIs:', error)
    // Return empty data on error - don't fake it
    return {
      avgDaysToDelivery: 0,
      avgDaysToTechSetup: 0,
      avgDaysToSequences: 0,
      deliveryTrend: 'flat',
      monthlyData: []
    }
  }
}

// Fetch mailbox health summary
async function fetchMailboxHealth(baseUrl: string): Promise<MailboxSummary> {
  try {
    const response = await fetch(`${baseUrl}/api/mailbox-health`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch mailbox health')
    }

    const data = await response.json()
    const { summary } = data

    // Calculate ready to launch % (healthy mailboxes / total)
    const readyToLaunchPercent = summary.total > 0 
      ? Math.round((summary.healthy / summary.total) * 100)
      : 0

    return {
      total: summary.total || 0,
      healthy: summary.healthy || 0,
      warning: summary.warning || 0,
      critical: summary.critical || 0,
      instantly: summary.instantly || 0,
      bison: summary.bison || 0,
      readyToLaunchPercent
    }
  } catch (error) {
    console.error('Error fetching mailbox health:', error)
    return {
      total: 0,
      healthy: 0,
      warning: 0,
      critical: 0,
      instantly: 0,
      bison: 0,
      readyToLaunchPercent: 0
    }
  }
}

// Fetch submissions summary
async function fetchSubmissions(baseUrl: string): Promise<SubmissionStats> {
  try {
    const response = await fetch(`${baseUrl}/api/submissions`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch submissions')
    }

    const data = await response.json()
    const submissions = data.submissions || []

    // Calculate stats
    const stats = {
      total: submissions.length,
      pending: submissions.filter((s: any) => s.status === 'pending').length,
      approved: submissions.filter((s: any) => s.status === 'approved').length,
      rejected: submissions.filter((s: any) => s.status === 'rejected').length,
      launched: submissions.filter((s: any) => s.status === 'launched').length,
      recentSubmissions: submissions
        .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 5)
        .map((s: any) => ({
          id: s.id,
          clientName: s.clientName,
          status: s.status,
          submittedAt: s.submittedAt,
          platform: s.platform
        }))
    }

    return stats
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      launched: 0,
      recentSubmissions: []
    }
  }
}

// Calculate at-risk clients (no activity in 14+ days)
async function calculateAtRiskClients(
  baseUrl: string,
  submissions: SubmissionStats
): Promise<AtRiskClient[]> {
  try {
    const clientsResult = await getAllClients()
    if (!clientsResult.success) return []
    
    const clients = (clientsResult as any).clients || []
    const now = new Date()
    const atRiskClients: AtRiskClient[] = []
    
    // Get mailbox health per client
    let mailboxData: any[] = []
    try {
      const mbResponse = await fetch(`${baseUrl}/api/mailbox-health`, { cache: 'no-store' })
      if (mbResponse.ok) {
        const mbData = await mbResponse.json()
        mailboxData = mbData.mailboxes || []
      }
    } catch (e) {
      console.error('Error fetching mailbox data for at-risk calculation:', e)
    }
    
    for (const client of clients) {
      // Find most recent submission for this client
      const clientSubmissions = submissions.recentSubmissions.filter(
        s => s.clientName.toLowerCase() === client.name.toLowerCase()
      )
      
      let daysSinceActivity = 999
      let lastActivityDate = ''
      
      if (clientSubmissions.length > 0) {
        const latestSubmission = clientSubmissions[0]
        const submissionDate = new Date(latestSubmission.submittedAt)
        daysSinceActivity = Math.floor((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24))
        lastActivityDate = latestSubmission.submittedAt
      }
      
      // Check for mailbox issues
      const clientMailboxes = mailboxData.filter(
        mb => mb.clientName?.toLowerCase() === client.name.toLowerCase()
      )
      const hasMailboxIssues = clientMailboxes.some(mb => mb.status === 'critical')
      
      if (daysSinceActivity >= 14 || hasMailboxIssues) {
        atRiskClients.push({
          id: client.id || client.name,
          clientName: client.name,
          platform: client.platform || 'unknown',
          daysSinceActivity,
          hasMailboxIssues,
          lastActivityDate
        })
      }
    }
    
    return atRiskClients.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
  } catch (error) {
    console.error('Error calculating at-risk clients:', error)
    return []
  }
}

// Calculate client health breakdown
async function calculateClientHealth(
  baseUrl: string,
  submissions: SubmissionStats
): Promise<ClientHealth> {
  try {
    const clientsResult = await getAllClients()
    if (!clientsResult.success) {
      return { healthy: 0, needsAttention: 0, atRisk: 0, details: [] }
    }
    
    const clients = (clientsResult as any).clients || []
    const now = new Date()
    
    // Get mailbox health per client
    let mailboxData: any[] = []
    try {
      const mbResponse = await fetch(`${baseUrl}/api/mailbox-health`, { cache: 'no-store' })
      if (mbResponse.ok) {
        const mbData = await mbResponse.json()
        mailboxData = mbData.mailboxes || []
      }
    } catch (e) {
      console.error('Error fetching mailbox data:', e)
    }
    
    const details: ClientHealth['details'] = []
    let healthy = 0
    let needsAttention = 0
    let atRisk = 0
    
    for (const client of clients) {
      const issues: string[] = []
      
      // Check submission activity
      const clientSubmissions = submissions.recentSubmissions.filter(
        s => s.clientName.toLowerCase() === client.name.toLowerCase()
      )
      
      let daysSinceActivity = 999
      if (clientSubmissions.length > 0) {
        const latestSubmission = clientSubmissions[0]
        const submissionDate = new Date(latestSubmission.submittedAt)
        daysSinceActivity = Math.floor((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24))
      }
      
      if (daysSinceActivity >= 14) {
        issues.push(`No activity in ${daysSinceActivity} days`)
      }
      
      // Check mailbox health
      const clientMailboxes = mailboxData.filter(
        mb => mb.clientName?.toLowerCase() === client.name.toLowerCase()
      )
      const criticalMailboxes = clientMailboxes.filter(mb => mb.status === 'critical').length
      const warningMailboxes = clientMailboxes.filter(mb => mb.status === 'warning').length
      
      if (criticalMailboxes > 0) {
        issues.push(`${criticalMailboxes} critical mailbox${criticalMailboxes > 1 ? 'es' : ''}`)
      }
      if (warningMailboxes > 0) {
        issues.push(`${warningMailboxes} mailbox${warningMailboxes > 1 ? 'es' : ''} need attention`)
      }
      
      // Determine status
      let status: 'healthy' | 'attention' | 'atRisk'
      if (criticalMailboxes > 0 || daysSinceActivity >= 14) {
        status = 'atRisk'
        atRisk++
      } else if (warningMailboxes > 0 || daysSinceActivity >= 7) {
        status = 'attention'
        needsAttention++
      } else {
        status = 'healthy'
        healthy++
      }
      
      details.push({
        id: client.id || client.name,
        clientName: client.name,
        platform: client.platform || 'unknown',
        status,
        issues
      })
    }
    
    return { healthy, needsAttention, atRisk, details }
  } catch (error) {
    console.error('Error calculating client health:', error)
    return { healthy: 0, needsAttention: 0, atRisk: 0, details: [] }
  }
}

// Calculate action required items
async function calculateActionRequired(
  baseUrl: string,
  submissions: SubmissionStats,
  mailboxHealth: MailboxSummary
): Promise<ActionRequired> {
  const now = new Date()
  
  // Pending submissions
  const pendingSubmissions = submissions.recentSubmissions.filter(s => s.status === 'pending')
  let oldestWaitingDays = 0
  let oldestClient = ''
  
  if (pendingSubmissions.length > 0) {
    // Sort by date ascending to get oldest
    const sortedPending = [...pendingSubmissions].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    )
    const oldest = sortedPending[0]
    oldestWaitingDays = Math.floor((now.getTime() - new Date(oldest.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
    oldestClient = oldest.clientName
  }
  
  // Stuck deliveries (approved but not launched for > 3 days)
  const approvedSubmissions = submissions.recentSubmissions.filter(s => s.status === 'approved')
  let stuckCount = 0
  let longestWaitingDays = 0
  
  for (const sub of approvedSubmissions) {
    const daysSinceApproved = Math.floor((now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceApproved > 3) {
      stuckCount++
      if (daysSinceApproved > longestWaitingDays) {
        longestWaitingDays = daysSinceApproved
      }
    }
  }
  
  // Get unique clients with failing mailboxes
  let clientsWithCritical = 0
  try {
    const mbResponse = await fetch(`${baseUrl}/api/mailbox-health`, { cache: 'no-store' })
    if (mbResponse.ok) {
      const mbData = await mbResponse.json()
      const mailboxes = mbData.mailboxes || []
      const criticalClients = new Set(
        mailboxes.filter((mb: any) => mb.status === 'critical').map((mb: any) => mb.clientName)
      )
      clientsWithCritical = criticalClients.size
    }
  } catch (e) {
    console.error('Error getting clients with critical mailboxes:', e)
  }
  
  return {
    pendingSubmissions: {
      count: submissions.pending,
      oldestWaitingDays,
      oldestClient
    },
    failingMailboxes: {
      count: mailboxHealth.critical,
      clientsAffected: clientsWithCritical
    },
    stuckDeliveries: {
      count: stuckCount,
      longestWaitingDays
    }
  }
}

// Get longest waiting submission
function calculateLongestWaiting(submissions: SubmissionStats): LongestWaiting | null {
  const pendingSubmissions = submissions.recentSubmissions.filter(s => s.status === 'pending')
  
  if (pendingSubmissions.length === 0) return null
  
  const now = new Date()
  const sortedPending = [...pendingSubmissions].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  )
  
  const oldest = sortedPending[0]
  const daysWaiting = Math.floor((now.getTime() - new Date(oldest.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    clientName: oldest.clientName,
    daysWaiting,
    submittedAt: oldest.submittedAt,
    platform: oldest.platform
  }
}

// Calculate delivery SLA performance
function calculateDeliverySLA(submissions: SubmissionStats, targetDays: number = 7): DeliverySLA {
  const now = new Date()
  const launchedSubmissions = submissions.recentSubmissions.filter(s => s.status === 'launched')
  const pendingSubmissions = submissions.recentSubmissions.filter(s => s.status === 'pending')
  
  // For launched submissions, we'd ideally have delivery date - for now estimate
  // In a real scenario, you'd track the actual delivery date
  const withinTarget = launchedSubmissions.length // Assume all launched are within target for now
  const total = launchedSubmissions.length + pendingSubmissions.filter(s => {
    const days = Math.floor((now.getTime() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
    return days > targetDays
  }).length
  
  const withinTargetPercent = total > 0 ? Math.round((withinTarget / total) * 100) : 100
  
  // Clients waiting (pending with days waiting)
  const clientsWaiting = pendingSubmissions.map(s => ({
    clientName: s.clientName,
    daysWaiting: Math.floor((now.getTime() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24)),
    platform: s.platform
  })).sort((a, b) => b.daysWaiting - a.daysWaiting)
  
  return {
    withinTargetPercent,
    targetDays,
    clientsWaiting
  }
}

// Calculate client performance (mock - would need real campaign data)
function calculateClientPerformance(): { top5: ClientPerformance[], bottom5: ClientPerformance[] } {
  // In a real implementation, this would fetch from campaign stats
  // For now, return empty arrays - the UI will handle this gracefully
  return {
    top5: [],
    bottom5: []
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'
    
    // Get base URL for internal API calls
    const baseUrl = url.origin

    // Check cache first (unless force refresh)
    if (!forceRefresh && dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_TTL) {
      console.log('✓ Returning cached dashboard data')
      return NextResponse.json({
        success: true,
        cached: true,
        cacheAge: Math.round((Date.now() - dashboardCache.timestamp) / 1000),
        ...dashboardCache.data
      })
    }

    console.log('Fetching fresh dashboard data...')
    const startTime = Date.now()

    // Fetch all data in parallel
    const [clientsResult, operationsKPIs, mailboxHealth, submissions] = await Promise.all([
      getAllClients(),
      fetchOperationsKPIs(),
      fetchMailboxHealth(baseUrl),
      fetchSubmissions(baseUrl)
    ])

    // Process clients data
    const clientStats = {
      total: clientsResult.success ? (clientsResult as any).total : 0,
      instantly: clientsResult.success ? (clientsResult as any).instantly_count : 0,
      bison: clientsResult.success ? (clientsResult as any).bison_count : 0
    }

    // Calculate CS-focused metrics
    const [atRiskClients, clientHealth, actionRequired] = await Promise.all([
      calculateAtRiskClients(baseUrl, submissions),
      calculateClientHealth(baseUrl, submissions),
      calculateActionRequired(baseUrl, submissions, mailboxHealth)
    ])
    
    const longestWaiting = calculateLongestWaiting(submissions)
    const deliverySLA = calculateDeliverySLA(submissions)
    const clientPerformance = calculateClientPerformance()

    const elapsed = Date.now() - startTime
    console.log(`✓ Dashboard data fetched in ${elapsed}ms`)

    const dashboardData = {
      timestamp: new Date().toISOString(),
      clients: clientStats,
      operationsKPIs,
      mailboxHealth,
      submissions,
      // New CS-focused metrics
      atRiskClients,
      clientHealth,
      actionRequired,
      longestWaiting,
      deliverySLA,
      clientPerformance
    }

    // Cache the result
    dashboardCache = {
      data: dashboardData,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      cached: false,
      ...dashboardData
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
