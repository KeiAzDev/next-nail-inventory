// src/app/api/auth/validate/route.ts
import { SessionManager } from '@/lib/session-manager'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, storeId } = await request.json()
    
    if (!token || !storeId) {
      return NextResponse.json({ isValid: false }, { status: 400 })
    }

    const sessionManager = new SessionManager(storeId)
    const isValid = await sessionManager.validateSession(token)
    
    return NextResponse.json({ isValid })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({ isValid: false }, { status: 500 })
  }
}