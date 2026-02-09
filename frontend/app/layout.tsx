import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'High-Ticket Strategist Portal',
  description: 'Campaign management and validation portal for high-ticket strategists',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </AuthProvider>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          toastOptions={{
            duration: 4000,
            className: 'text-sm',
          }}
        />
      </body>
    </html>
  )
}
