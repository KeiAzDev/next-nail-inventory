import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route' // Adjust the import path as necessary

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const resolvedParams = await context.params
    const storeId = resolvedParams.id
    
    if (session.user.storeId !== storeId && session.user.role !== 'ADMIN' || 
        (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: '商品の更新に失敗しました' }, { status: 500 })
  }
}