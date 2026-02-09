'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Sidebar />
      <main className="pl-64">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </>
  )
}
