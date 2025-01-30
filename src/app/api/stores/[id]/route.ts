//app/api/stores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // paramsそのものを非同期で解決
    const resolvedParams = await context.params
    const storeId = resolvedParams.id

    // セッションユーザーの権限チェック
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Store fetch error:', error)
    return NextResponse.json(
      { error: '店舗情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // paramsそのものを非同期で解決
    const resolvedParams = await context.params
    const storeId = resolvedParams.id

    // ADMINまたはMANAGERのみ店舗情報を更新可能
    if (
      session.user.storeId !== storeId && 
      session.user.role !== 'ADMIN' || 
      (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const store = await prisma.store.update({
      where: { id: storeId },
      data: body
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Store update error:', error)
    return NextResponse.json(
      { error: '店舗情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}