// src/app/api/stores/[id]/staff/[staffId]/role/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await context.params
    const { id: storeId, staffId } = resolvedParams

    const targetStaff = await prisma.user.findUnique({
      where: { id: staffId }
    })

    if (!targetStaff) {
      return new NextResponse('Staff not found', { status: 404 })
    }

    const body = await request.json()
    const { role } = body

    if (role === 'ADMIN') {
      return new NextResponse('Cannot set ADMIN role', { status: 400 })
    }

    const updatedStaff = await prisma.user.update({
      where: { id: staffId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedStaff)
  } catch (error) {
    console.error('Role update error:', error)
    return NextResponse.json(
      { error: 'ロールの更新に失敗しました' },
      { status: 500 }
    )
  }
}