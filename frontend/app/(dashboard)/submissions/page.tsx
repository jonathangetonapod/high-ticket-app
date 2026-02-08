'use client'

import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare, Construction } from 'lucide-react'

export default function SubmissionsPage() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Submissions" 
        description="Review past delivery checklist submissions"
      />

      <div className="p-8">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Construction className="text-amber-600" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mt-4">Coming Soon</h3>
            <p className="text-sm text-gray-500 mt-2">
              Submission history will be available here.
              Track approved deliveries, pending reviews, and revision requests.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
