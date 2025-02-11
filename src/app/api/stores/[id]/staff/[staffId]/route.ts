// src/app/api/stores/[id]/staff/[staffId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Role } from '@prisma/client'
import { hash } from 'bcryptjs'

// 権限チェック関数
const validatePermissions = (
  currentUserRole: Role,
  currentUserId: string,
  targetUserId: string,
  targetUserRole: Role,
  action: 'update' | 'delete' | 'role'
): boolean => {
  switch (currentUserRole) {
    case 'ADMIN':
      return true
    case 'MANAGER':
      return (
        action !== 'role' && 
        targetUserRole === 'STAFF'
      )
    case 'STAFF':
      return action === 'update' && currentUserId === targetUserId
    default:
      return false
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
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

    const hasPermission = validatePermissions(
      session.user.role as Role,
      session.user.id,
      staffId,
      targetStaff.role,
      'update'
    )

    if (!hasPermission) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const { password, ...updateData } = body

    const updatePayload: any = { ...updateData }
    if (password) {
      updatePayload.password = await hash(password, 12)
    }

    const updatedStaff = await prisma.user.update({
      where: { id: staffId },
      data: updatePayload,
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
    console.error('Staff update error:', error)
    return NextResponse.json(
      { error: 'スタッフ情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
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

    const hasPermission = validatePermissions(
      session.user.role as Role,
      session.user.id,
      staffId,
      targetStaff.role,
      'delete'
    )

    if (!hasPermission) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // 論理削除のためのフラグを設定
    await prisma.user.update({
      where: { id: staffId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Staff deletion error:', error)
    return NextResponse.json(
      { error: 'スタッフの削除に失敗しました' },
      { status: 500 }
    )
  }
}