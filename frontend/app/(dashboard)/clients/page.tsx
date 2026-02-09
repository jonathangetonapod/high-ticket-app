'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Users, Mail, Activity, Loader2, FileText, ExternalLink, RefreshCw } from 'lucide-react'

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CNejGg-egkp28ItSRfW7F_CkBXgYevjzstJ1QlrAyAY'

interface Client {
  id: string
  name: string
  platform: 'instantly' | 'bison'
  workspaceId: string
  workspaceName?: string
  email?: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()
      if (data.success) {
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.platform.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const instantlyCount = clients.filter(c => c.platform === 'instantly').length
  const bisonCount = clients.filter(c => c.platform === 'bison').length

  return (
    <div className="min-h-screen">
      <Header 
        title="Clients" 
        description="Manage all your high-ticket clients"
      />

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="text-gray-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-sm text-gray-500">Total Clients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{instantlyCount}</p>
                <p className="text-sm text-gray-500">Instantly</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Activity className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{bisonCount}</p>
                <p className="text-sm text-gray-500">Bison</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Indicator */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zM19 19c0 .55-.45 1-1 1s-1-.45-1-1v-3H8V5h11v14z"/>
                <path d="M9 7h6v2H9zm7 0h2v2h-2zm-7 3h6v2H9zm7 0h2v2h-2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Data synced from Google Sheets</p>
              <p className="text-xs text-gray-500">Client credentials and workspace info</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setLoading(true); loadClients() }}
              disabled={loading}
            >
              <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={GOOGLE_SHEET_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} className="mr-1" />
                Open Sheet
              </a>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        {/* Client List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      {client.workspaceName && (
                        <p className="text-xs text-gray-500 mt-0.5">{client.workspaceName}</p>
                      )}
                    </div>
                    <Badge variant={client.platform === 'instantly' ? 'default' : 'secondary'}>
                      {client.platform}
                    </Badge>
                  </div>
                  {client.email && (
                    <p className="text-xs text-gray-400 mt-2">{client.email}</p>
                  )}
                  <div className="mt-3 pt-3 border-t">
                    <Link href={`/clients/${encodeURIComponent(client.name)}/context`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <FileText size={14} />
                        Context
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-300" size={48} />
            <p className="text-gray-500 mt-4">No clients found</p>
          </div>
        )}
      </div>
    </div>
  )
}
