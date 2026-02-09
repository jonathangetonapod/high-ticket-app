'use client'

import { Loader2, Upload, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { LeadListData } from './types'

interface LeadUploaderProps {
  campaignName: string
  leadListData: LeadListData | null
  isUploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}

export function LeadUploader({
  campaignName,
  leadListData,
  isUploading,
  onUpload,
  onRemove
}: LeadUploaderProps) {
  if (!leadListData) {
    return (
      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onUpload(file)
              }
            }}
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-sm text-gray-600">Processing CSV...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="text-gray-400" size={32} />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Upload CSV Lead List
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  For: {campaignName}
                </p>
              </div>
            </div>
          )}
        </div>
      </label>
    )
  }

  return (
    <div className="space-y-4">
      {/* Lead List Summary */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-900">
                  {leadListData.file?.name || 'Lead list uploaded'}
                </p>
                <p className="text-sm text-emerald-700">
                  {leadListData.leadCount.toLocaleString()} leads ready for ICP validation
                </p>
              </div>
            </div>
            <button
              onClick={onRemove}
              className="text-xs text-red-600 hover:text-red-700 hover:underline"
            >
              Remove
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Issues Warning */}
      {leadListData.issues.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Potential Issues Detected:
                </p>
                <ul className="space-y-1">
                  {leadListData.issues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-amber-700">
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Leads Preview */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Sample Leads (first {Math.min(5, leadListData.sampleLeads.length)}):
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {leadListData.sampleLeads.slice(0, 5).map((lead, idx) => (
              <div
                key={idx}
                className="bg-gray-50 p-3 rounded border text-xs"
              >
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(lead).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="truncate">
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="text-gray-900 font-medium">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
