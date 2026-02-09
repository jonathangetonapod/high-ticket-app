'use client'

import { Download, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProcessedLeadInsights } from './LeadInsights'
import { getCleanedLeadsStats, downloadCleanedLeads, downloadIssuesReport } from '@/lib/email-utils'

interface DownloadButtonsProps {
  file: File | undefined
  insights: ProcessedLeadInsights
  campaignName: string
}

export function DownloadButtons({ file, insights, campaignName }: DownloadButtonsProps) {
  const stats = getCleanedLeadsStats(insights)

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-emerald-600" />
          <h4 className="font-semibold text-emerald-900">Export Cleaned Data</h4>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Download Cleaned Leads Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700"
            onClick={() => {
              if (file) {
                downloadCleanedLeads(file, insights, campaignName)
              }
            }}
          >
            <Download size={14} className="mr-2" />
            <span className="flex items-center gap-1">
              Download
              <span className="font-bold text-emerald-600">
                {stats.cleanedCount.toLocaleString()}
              </span>
              Cleaned Leads
            </span>
          </Button>
          
          {/* Download Issues Report Button */}
          {stats.removedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-amber-300 bg-white hover:bg-amber-50 text-amber-700"
              onClick={() => {
                downloadIssuesReport(insights, campaignName)
              }}
            >
              <FileWarning size={14} className="mr-2" />
              Download Issues Report
            </Button>
          )}
        </div>
        
        {/* Stats Summary */}
        <div className="text-xs text-gray-600 pt-2 border-t border-emerald-100">
          <span className="text-emerald-600 font-medium">
            ✓ {stats.cleanedCount.toLocaleString()} valid
          </span>
          {stats.removedCount > 0 && (
            <span className="text-red-500 ml-3">
              ✕ {stats.removedCount.toLocaleString()} removed
              <span className="text-gray-400 ml-1">
                ({stats.invalidCount} invalid, {stats.disposableCount} disposable, {stats.duplicateCount} duplicate)
              </span>
            </span>
          )}
          {stats.genericCount > 0 && (
            <span className="text-amber-500 ml-3">
              ⚠ {stats.genericCount} generic (included but flagged)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
