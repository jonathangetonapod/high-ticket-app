'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MergePreviewControlsProps {
  hasLeads: boolean
  previewLead: Record<string, any> | null
  currentLeadIndex: number
  totalLeads: number
  onNavigate: (direction: 'prev' | 'next') => void
}

export function MergePreviewControls({
  hasLeads,
  previewLead,
  currentLeadIndex,
  totalLeads,
  onNavigate
}: MergePreviewControlsProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-sky-100 rounded-lg border border-sky-200">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-sky-800">
          Previewing with:
        </span>
        {hasLeads && previewLead ? (
          <span className="text-xs bg-white px-2 py-1 rounded border border-sky-300 text-sky-900 font-mono">
            {previewLead.email || previewLead.Email || 
             `${previewLead.first_name || previewLead.firstName || ''} ${previewLead.last_name || previewLead.lastName || ''}`.trim() ||
             `Lead ${currentLeadIndex + 1}`}
          </span>
        ) : (
          <span className="text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200 text-amber-700">
            No leads uploaded - using placeholders
          </span>
        )}
      </div>
      {hasLeads && totalLeads > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1 rounded hover:bg-sky-200 text-sky-700 transition-colors"
            title="Previous lead"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-sky-700 min-w-[3rem] text-center">
            {currentLeadIndex + 1} / {totalLeads}
          </span>
          <button
            onClick={() => onNavigate('next')}
            className="p-1 rounded hover:bg-sky-200 text-sky-700 transition-colors"
            title="Next lead"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
