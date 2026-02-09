'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Plus,
  Loader2,
  Save,
  Trash2,
  ArrowLeft,
  Clock,
  Edit,
  Eye
} from 'lucide-react'

interface RequirementFile {
  slug: string
  name: string
  content: string
  updatedAt: string
}

export default function AdminRequirementsPage() {
  const [requirements, setRequirements] = useState<RequirementFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReq, setSelectedReq] = useState<RequirementFile | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // New file form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newContent, setNewContent] = useState('# New Requirement\n\nAdd your requirements here...')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadRequirements()
  }, [])

  const loadRequirements = async () => {
    try {
      const response = await fetch('/api/requirements')
      const data = await response.json()
      if (data.success) {
        setRequirements(data.requirements)
      }
    } catch (error) {
      console.error('Error loading requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectRequirement = (req: RequirementFile) => {
    setSelectedReq(req)
    setEditContent(req.content)
    setShowPreview(false)
    setShowNewForm(false)
  }

  const handleSave = async () => {
    if (!selectedReq) return

    setSaving(true)
    try {
      const response = await fetch(`/api/requirements/${selectedReq.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setRequirements(requirements.map(r => 
          r.slug === selectedReq.slug 
            ? { ...r, content: editContent, updatedAt: new Date().toISOString() }
            : r
        ))
        setSelectedReq({ ...selectedReq, content: editContent })
        toast.success('Saved!')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newSlug, content: newContent })
      })

      const data = await response.json()

      if (data.success) {
        await loadRequirements()
        setShowNewForm(false)
        setNewSlug('')
        setNewContent('# New Requirement\n\nAdd your requirements here...')
        toast.success('Requirement created')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedReq) return
    if (!confirm(`Delete "${selectedReq.name}"? This cannot be undone.`)) return

    try {
      const response = await fetch(`/api/requirements/${selectedReq.slug}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setRequirements(requirements.filter(r => r.slug !== selectedReq.slug))
        setSelectedReq(null)
        toast.success('Requirement deleted')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Requirements"
        description="Edit best practices and validation rules"
      />

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar - File List */}
        <div className="w-72 border-r bg-gray-50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Files</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewForm(true)
                setSelectedReq(null)
              }}
              className="gap-1"
            >
              <Plus size={14} />
              New
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : (
            <div className="space-y-1">
              {requirements.map((req) => (
                <button
                  key={req.slug}
                  onClick={() => selectRequirement(req)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedReq?.slug === req.slug
                      ? 'bg-gray-900 text-white'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} />
                    <span className="text-sm font-medium truncate">{req.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {showNewForm ? (
            // New File Form
            <div className="p-6 max-w-3xl">
              <div className="flex items-center gap-2 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewForm(false)}
                >
                  <ArrowLeft size={16} />
                </Button>
                <h2 className="text-lg font-semibold">Create New Requirement</h2>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">File Name (slug)</Label>
                  <Input
                    id="slug"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="e.g., follow-up-rules"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Will be saved as: {newSlug || 'file-name'}.md
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Create File
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : selectedReq ? (
            // Editor
            <div className="h-full flex flex-col">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedReq.name}</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={10} />
                    Updated {formatDate(selectedReq.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-1"
                  >
                    {showPreview ? <Edit size={14} /> : <Eye size={14} />}
                    {showPreview ? 'Edit' : 'Preview'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || editContent === selectedReq.content}
                    className="gap-1"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {showPreview ? (
                  <div className="h-full overflow-y-auto p-6">
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ 
                        __html: editContent
                          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                          .replace(/\*(.*)\*/gim, '<em>$1</em>')
                          .replace(/^- (.*$)/gim, '<li>$1</li>')
                          .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/`([^`]+)`/g, '<code>$1</code>')
                      }} />
                    </div>
                  </div>
                ) : (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="h-full w-full border-0 rounded-none font-mono text-sm resize-none focus:ring-0"
                    placeholder="Enter markdown content..."
                  />
                )}
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <FileText className="mx-auto text-gray-300" size={48} />
                <p className="text-gray-500 mt-4">Select a file to edit</p>
                <p className="text-sm text-gray-400 mt-1">
                  or create a new requirement
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
