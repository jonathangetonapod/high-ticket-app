import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | High-Ticket Strategist Portal',
  description: 'Sign in to the High-Ticket Strategist Portal',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
