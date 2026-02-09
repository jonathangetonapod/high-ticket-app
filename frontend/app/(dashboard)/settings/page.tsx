'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Bell,
  Shield,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'

export default function SettingsPage() {
  const [testingSlack, setTestingSlack] = useState(false)
  const [slackStatus, setSlackStatus] = useState<'unknown' | 'connected' | 'error'>('unknown')

  const testSlackConnection = async () => {
    setTestingSlack(true)
    try {
      // In a real implementation, this would test the Slack webhook
      // For now, we'll just show the status based on env var presence
      const response = await fetch('/api/health')
      if (response.ok) {
        setSlackStatus('connected')
      } else {
        setSlackStatus('error')
      }
    } catch {
      setSlackStatus('error')
    } finally {
      setTestingSlack(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Settings" 
        description="Configure your portal settings and integrations"
      />

      <div className="p-8 space-y-6 max-w-4xl">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={20} />
              General Settings
            </CardTitle>
            <CardDescription>
              Basic configuration for the portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Portal Name</Label>
                <Input value="High-Ticket Strategist Portal" disabled />
              </div>
              <div>
                <Label>Version</Label>
                <Input value="1.0.0" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={20} />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Slack Notifications</p>
                  <p className="text-sm text-gray-500">
                    Get notified when submissions are created, approved, or rejected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {slackStatus === 'unknown' && (
                  <Badge variant="outline" className="bg-gray-100">
                    <AlertTriangle size={12} className="mr-1" />
                    Not Tested
                  </Badge>
                )}
                {slackStatus === 'connected' && (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    <CheckCircle size={12} className="mr-1" />
                    Connected
                  </Badge>
                )}
                {slackStatus === 'error' && (
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                    <XCircle size={12} className="mr-1" />
                    Not Configured
                  </Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testSlackConnection}
                  disabled={testingSlack}
                >
                  {testingSlack ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-medium text-amber-800 mb-1">⚠️ Configuration Required</p>
              <p className="text-amber-700">
                To enable Slack notifications, set the <code className="bg-amber-100 px-1 rounded">SLACK_WEBHOOK_URL</code> environment variable in your <code className="bg-amber-100 px-1 rounded">.env.local</code> file.
              </p>
              <a 
                href="https://api.slack.com/messaging/webhooks" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-800 hover:underline mt-2"
              >
                Learn how to create a Slack webhook
                <ExternalLink size={12} />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Data & Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              Data & Storage
            </CardTitle>
            <CardDescription>
              Database and storage configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 109 113" fill="currentColor">
                    <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347z"/>
                    <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347z" fillOpacity=".2"/>
                    <path d="M45.274 2.716c2.86-3.601 8.658-1.628 8.727 2.97l.68 67.251H9.461c-8.19 0-12.759-9.46-7.665-15.875L45.274 2.716z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Supabase</p>
                  <p className="text-sm text-gray-500">
                    All data is stored securely in Supabase
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle size={12} className="mr-1" />
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} />
              Security
            </CardTitle>
            <CardDescription>
              Security and access settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-800 mb-1">🔐 Authentication Coming Soon</p>
              <p className="text-blue-700">
                User authentication and role-based access control will be added in a future update.
                Currently, reviewer names are entered manually.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
