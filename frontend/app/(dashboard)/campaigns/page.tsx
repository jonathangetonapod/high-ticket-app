'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Construction } from 'lucide-react'

export default function CampaignsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Campaigns" 
        description="View all campaigns across clients"
      />

      <div className="p-8">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
              <Construction className="text-purple-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Coming Soon</h3>
            <p className="text-sm text-gray-500 mt-2">
              Campaign overview across all clients will be available here.
              For now, use the Delivery Checklist to view campaigns per client.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
