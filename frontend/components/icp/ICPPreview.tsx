'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Target, Check, X, Edit2, Plus, Trash2 } from 'lucide-react'

export interface ExtractedICP {
  targetTitles: string[]
  companySizes: string[]
  industries: string[]
  geography: string[]
  exclusions: string[]
  painPoints: string[]
  budget: string
  timeline: string
  keyQuotes: string[]
}

interface ICPPreviewProps {
  data: ExtractedICP
  onApply: (data: ExtractedICP) => void
  onDismiss: () => void
}

interface EditableListProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

function EditableList({ label, items, onChange, placeholder }: EditableListProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()])
      setNewItem('')
    }
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  if (items.length === 0 && !isEditing) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <span className="font-medium text-gray-600">{label}:</span>
        <span className="italic">Not mentioned</span>
        <button 
          onClick={() => setIsEditing(true)}
          className="text-blue-500 hover:text-blue-600"
        >
          <Plus size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600 text-sm">{label}:</span>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit2 size={12} />
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2 pl-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm flex-1">{item}</span>
              <button 
                onClick={() => removeItem(index)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={placeholder || 'Add item...'}
              className="h-7 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <Button size="sm" variant="ghost" onClick={addItem} className="h-7 px-2">
              <Plus size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2">
              <Check size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-800 pl-2">
          {items.join(', ')}
        </div>
      )}
    </div>
  )
}

interface EditableFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function EditableField({ label, value, onChange, placeholder }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  if (!value && !isEditing) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <span className="font-medium text-gray-600">{label}:</span>
        <span className="italic">Not mentioned</span>
        <button 
          onClick={() => setIsEditing(true)}
          className="text-blue-500 hover:text-blue-600"
        >
          <Plus size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-600 text-sm">{label}:</span>
        {!isEditing && (
          <button 
            onClick={() => { setEditValue(value); setIsEditing(true) }}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit2 size={12} />
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex items-center gap-2 pl-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="h-7 text-sm flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 px-2">
            <Check size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2">
            <X size={14} />
          </Button>
        </div>
      ) : (
        <div className="text-sm text-gray-800 pl-2">{value}</div>
      )}
    </div>
  )
}

export function ICPPreview({ data, onApply, onDismiss }: ICPPreviewProps) {
  const [editedData, setEditedData] = useState<ExtractedICP>(data)

  const updateField = <K extends keyof ExtractedICP>(field: K, value: ExtractedICP[K]) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }

  const hasData = 
    editedData.targetTitles.length > 0 ||
    editedData.companySizes.length > 0 ||
    editedData.industries.length > 0 ||
    editedData.geography.length > 0 ||
    editedData.painPoints.length > 0 ||
    editedData.budget ||
    editedData.timeline

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="text-blue-600" size={16} />
            </div>
            🎯 Extracted ICP
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X size={16} />
              Dismiss
            </Button>
            <Button 
              size="sm" 
              onClick={() => onApply(editedData)}
              disabled={!hasData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check size={16} />
              Apply All
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Review and edit before applying. Click field labels to edit.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <EditableList
              label="Target Titles"
              items={editedData.targetTitles}
              onChange={(items) => updateField('targetTitles', items)}
              placeholder="e.g., VP of Sales"
            />
            
            <EditableList
              label="Company Size"
              items={editedData.companySizes}
              onChange={(items) => updateField('companySizes', items)}
              placeholder="e.g., 50-200"
            />
            
            <EditableList
              label="Industries"
              items={editedData.industries}
              onChange={(items) => updateField('industries', items)}
              placeholder="e.g., SaaS"
            />
            
            <EditableList
              label="Geography"
              items={editedData.geography}
              onChange={(items) => updateField('geography', items)}
              placeholder="e.g., US, Canada"
            />
          </div>
          
          <div className="space-y-3">
            <EditableList
              label="Exclusions"
              items={editedData.exclusions}
              onChange={(items) => updateField('exclusions', items)}
              placeholder="e.g., Agencies"
            />
            
            <EditableField
              label="Budget"
              value={editedData.budget}
              onChange={(value) => updateField('budget', value)}
              placeholder="e.g., $5k-10k/month"
            />
            
            <EditableField
              label="Timeline"
              value={editedData.timeline}
              onChange={(value) => updateField('timeline', value)}
              placeholder="e.g., Q1 launch"
            />
          </div>
        </div>
        
        {/* Pain Points - Full Width */}
        <div className="border-t pt-4">
          <EditableList
            label="Pain Points"
            items={editedData.painPoints}
            onChange={(items) => updateField('painPoints', items)}
            placeholder="e.g., Scaling outbound without hiring SDRs"
          />
        </div>
        
        {/* Key Quotes - Full Width with special styling */}
        {editedData.keyQuotes.length > 0 && (
          <div className="border-t pt-4">
            <span className="font-medium text-gray-600 text-sm block mb-2">Key Quotes:</span>
            <div className="space-y-2">
              {editedData.keyQuotes.map((quote, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 bg-white/70 rounded-lg p-3 border border-gray-200"
                >
                  <span className="text-blue-400 text-lg leading-none">"</span>
                  <p className="text-sm text-gray-700 italic flex-1">{quote}</p>
                  <span className="text-blue-400 text-lg leading-none">"</span>
                  <button 
                    onClick={() => updateField('keyQuotes', editedData.keyQuotes.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-600 ml-2"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
