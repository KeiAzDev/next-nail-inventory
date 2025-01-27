import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'
import AuthProvider from '@/components/providers/auth-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nail Salon Inventory',
  description: 'Inventory management system for nail salons',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body cz-shortcut-listen="true" className={inter.className}>
        <AuthProvider>
          <main className="min-h-screen bg-gray-100">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
