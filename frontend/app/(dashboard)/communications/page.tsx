'use client'

import { Header } from '@/components/layout/Header'
import { ClientCommunications } from '@/components/communications/ClientCommunications'

export default function CommunicationsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Client Communications"
        description="Track team ↔ client email and Slack communications"
      />

      <div className="p-8">
        <ClientCommunications />
      </div>
    </div>
  )
}
