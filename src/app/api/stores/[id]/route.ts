import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const store = await prisma.store.findUnique({
      where: { id: params.id }
    })

    if (!store) {
      return new NextResponse('Store not found', { status: 404 })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Store fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}