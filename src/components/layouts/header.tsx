'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'

export default function Header() {
  const { data: session } = useSession()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
          {session?.user?.storeId ? (
              <Link 
                href={`/stores/${session.user.storeId}`}
                className="text-xl font-semibold hover:text-gray-600 transition-colors"
              >
                Inventory Management
              </Link>
            ) : (
              <h1 className="text-xl font-semibold">Inventory Management (No Name)</h1>
            )}
          </div>

          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center max-w-xs rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="sr-only">ユーザーメニュー</span>
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    <div className="px-4 py-2 text-sm text-gray-700">
                      {session?.user?.name}
                    </div>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={() => signOut()}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      サインアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}