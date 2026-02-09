'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, ChevronDown, Check } from 'lucide-react'

export interface TimeRange {
  preset: '7d' | '30d' | '90d' | 'custom' | null
  startDate: string | null
  endDate: string | null
}

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

const presets = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
] as const

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetSelect = (preset: '7d' | '30d' | '90d') => {
    setShowCustom(false)
    onChange({ preset, startDate: null, endDate: null })
  }

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      onChange({
        preset: 'custom',
        startDate: customStart,
        endDate: customEnd
      })
      setShowCustom(false)
    }
  }

  const getDisplayLabel = () => {
    if (value.preset === 'custom' && value.startDate && value.endDate) {
      return `${value.startDate} - ${value.endDate}`
    }
    const preset = presets.find(p => p.value === value.preset)
    return preset?.label || 'Select range'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[180px] justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{getDisplayLabel()}</span>
          </div>
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => handlePresetSelect(preset.value)}
            className="flex items-center justify-between"
          >
            {preset.label}
            {value.preset === preset.value && <Check size={14} />}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              setShowCustom(!showCustom)
            }}
            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 flex items-center justify-between"
          >
            Custom Range
            {value.preset === 'custom' && <Check size={14} />}
          </button>
          
          {showCustom && (
            <div className="mt-2 space-y-3 p-2 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs text-gray-500">Start Date</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">End Date</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleCustomRange}
                disabled={!customStart || !customEnd}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
