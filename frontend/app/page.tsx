'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ClipboardCheck,
  Users,
  Mail,
  Activity,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Dashboard" 
        description="Welcome back! Here's what's happening with your campaigns."
      />

      <div className="p-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Clients</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                <TrendingUp size={12} /> +3 this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">47</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Mail className="text-purple-600" size={24} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Across all clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Mailbox Health</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">94%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="text-green-600" size={24} />
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <AlertTriangle size={12} /> 12 need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">5</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="text-amber-600" size={24} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and workflows</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/delivery-checklist">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ClipboardCheck className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">New Delivery</p>
                      <p className="text-xs text-gray-500">Start machine checklist</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/mailbox-health">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-green-200">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Activity className="text-green-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Check Health</p>
                      <p className="text-xs text-gray-500">View mailbox status</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/clients">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-purple-200">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Users className="text-purple-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">View Clients</p>
                      <p className="text-xs text-gray-500">Manage client accounts</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/submissions">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-amber-200">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <CheckSquare className="text-amber-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Submissions</p>
                      <p className="text-xs text-gray-500">Review past deliveries</p>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </CardContent>
                </Card>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Acme Corp delivery approved</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">TechStart needs review</p>
                  <p className="text-xs text-gray-500">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">3 mailboxes unhealthy</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">New client: SalesForce Pro</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
