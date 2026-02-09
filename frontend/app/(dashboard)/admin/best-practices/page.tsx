'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BookOpen,
  Plus,
  Loader2,
  Save,
  Trash2,
  Clock,
  Edit,
  Eye,
  FileText,
  X,
  Search,
  Download,
  Upload
} from 'lucide-react'

interface Guide {
  id: string
  title: string
  category: string
  content: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'copy', label: 'Email Copy', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'leads', label: 'Lead Lists', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'warmup', label: 'Warmup', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'strategy', label: 'Strategy', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'campaigns', label: 'Campaigns', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'deliverability', label: 'Deliverability', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'copy', label: 'Copy' },
  { value: 'leads', label: 'Leads' },
  { value: 'warmup', label: 'Warmup' },
  { value: 'strategy', label: 'Strategy' },
]

export default function AdminBestPracticesPage() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [guideToDelete, setGuideToDelete] = useState<Guide | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Import/Export
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New guide form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newContent, setNewContent] = useState('# New Guide\n\nAdd your content here...')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadGuides()
  }, [])

  const loadGuides = async () => {
    try {
      const response = await fetch('/api/admin/best-practices')
      const data = await response.json()
      if (data.success) {
        setGuides(data.guides)
      }
    } catch (error) {
      console.error('Error loading guides:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtered guides based on category and search
  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const matchesCategory = activeFilter === 'all' || guide.category === activeFilter
      const matchesSearch = searchQuery === '' || 
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.content.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [guides, activeFilter, searchQuery])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: guides.length }
    FILTER_TABS.forEach(tab => {
      if (tab.value !== 'all') {
        counts[tab.value] = guides.filter(g => g.category === tab.value).length
      }
    })
    return counts
  }, [guides])

  const selectGuide = (guide: Guide) => {
    setSelectedGuide(guide)
    setEditContent(guide.content)
    setEditTitle(guide.title)
    setEditCategory(guide.category)
    setShowPreview(false)
    setShowNewForm(false)
  }

  const handleSave = async () => {
    if (!selectedGuide) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/best-practices/${selectedGuide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          category: editCategory,
          content: editContent
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setGuides(guides.map(g =>
          g.id === selectedGuide.id
            ? { ...g, title: editTitle, category: editCategory, content: editContent, updatedAt: new Date().toISOString() }
            : g
        ))
        setSelectedGuide({ ...selectedGuide, title: editTitle, category: editCategory, content: editContent })
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/admin/best-practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent
        })
      })

      const data = await response.json()

      if (data.success) {
        setGuides([...guides, data.guide])
        setShowNewForm(false)
        setNewTitle('')
        setNewCategory('general')
        setNewContent('# New Guide\n\nAdd your content here...')
        selectGuide(data.guide)
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const confirmDelete = (guide: Guide) => {
    setGuideToDelete(guide)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!guideToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/best-practices/${guideToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setGuides(guides.filter(g => g.id !== guideToDelete.id))
        if (selectedGuide?.id === guideToDelete.id) {
          setSelectedGuide(null)
        }
        setDeleteDialogOpen(false)
        setGuideToDelete(null)
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  // Export guides as JSON
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      guides: guides.map(({ id, ...rest }) => rest) // Remove IDs for cleaner export
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `best-practices-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import guides from JSON
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!data.guides || !Array.isArray(data.guides)) {
        alert('Invalid file format. Expected { guides: [...] }')
        return
      }

      // Import each guide
      let imported = 0
      for (const guide of data.guides) {
        if (guide.title && guide.content) {
          try {
            const response = await fetch('/api/admin/best-practices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: guide.title,
                category: guide.category || 'general',
                content: guide.content
              })
            })
            const result = await response.json()
            if (result.success) {
              imported++
            }
          } catch (err) {
            console.error('Failed to import guide:', guide.title)
          }
        }
      }

      alert(`Successfully imported ${imported} guide(s)`)
      loadGuides() // Reload all guides
    } catch (error) {
      alert('Failed to parse import file')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value
  }

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Simple markdown renderer
  const renderMarkdown = (content: string) => {
    return content
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/gim, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>$2</code></pre>')
      // Headers
      .replace(/^#### (.*$)/gim, '<h4 class="text-base font-semibold text-gray-900 mt-4 mb-2">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-gray-700">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal text-gray-700">$2</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      // Variables/placeholders
      .replace(/\{\{([^}]+)\}\}/g, '<code class="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200">{$1}</code>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="my-6 border-gray-200" />')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed mb-4">')
  }

  const hasChanges = selectedGuide && (
    editTitle !== selectedGuide.title ||
    editCategory !== selectedGuide.category ||
    editContent !== selectedGuide.content
  )

  return (
    <div className="min-h-screen">
      <Header
        title="Best Practices"
        description="Manage guidelines and documentation for strategists"
      />

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar - Guide List */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          {/* Header with actions */}
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Guides</h3>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExport}
                  className="h-8 w-8 p-0"
                  title="Export guides"
                >
                  <Download size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 p-0"
                  title="Import guides"
                >
                  <Upload size={14} />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(true)
                    setSelectedGuide(null)
                  }}
                  className="gap-1 h-8"
                >
                  <Plus size={14} />
                  New
                </Button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <Input
                placeholder="Search guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="px-4 py-3 border-b bg-white">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    activeFilter === tab.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1 ${activeFilter === tab.value ? 'text-gray-300' : 'text-gray-400'}`}>
                    {categoryCounts[tab.value] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Guide List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGuides.map((guide) => (
                  <button
                    key={guide.id}
                    onClick={() => selectGuide(guide)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedGuide?.id === guide.id
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-200 text-gray-700 bg-white border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          selectedGuide?.id === guide.id ? 'text-white' : 'text-gray-900'
                        }`}>
                          {guide.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            selectedGuide?.id === guide.id
                              ? 'bg-gray-700 text-gray-300 border-gray-600'
                              : getCategoryColor(guide.category)
                          }`}>
                            {getCategoryLabel(guide.category)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${
                          selectedGuide?.id === guide.id ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <Clock size={10} />
                          {formatDate(guide.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {filteredGuides.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-sm">
                      {searchQuery || activeFilter !== 'all' 
                        ? 'No guides match your filters' 
                        : 'No guides yet'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {showNewForm ? (
            // New Guide Form
            <div className="p-6 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Create New Guide</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewForm(false)}
                >
                  <X size={16} />
                </Button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Email Copy Standards"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0]}`} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                        Create Guide
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
          ) : selectedGuide ? (
            // Editor
            <div className="h-full flex flex-col">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="font-semibold text-lg border-0 p-0 h-auto focus-visible:ring-0 max-w-md"
                    />
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0]}`} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge className={getCategoryColor(editCategory)}>
                      {getCategoryLabel(editCategory)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock size={10} />
                    Updated {formatDate(selectedGuide.updatedAt)}
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
                    disabled={saving || !hasChanges}
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
                    onClick={() => confirmDelete(selectedGuide)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {showPreview ? (
                  <div className="h-full overflow-y-auto p-8 bg-white">
                    <div className="max-w-3xl mx-auto">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: `<p class="text-gray-700 leading-relaxed mb-4">${renderMarkdown(editContent)}</p>` }}
                      />
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
                <BookOpen className="mx-auto text-gray-300" size={48} />
                <p className="text-gray-500 mt-4">Select a guide to edit</p>
                <p className="text-sm text-gray-400 mt-1">
                  or create a new one
                </p>
                <Button
                  className="mt-4 gap-2"
                  onClick={() => setShowNewForm(true)}
                >
                  <Plus size={16} />
                  Create Guide
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guide</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{guideToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
