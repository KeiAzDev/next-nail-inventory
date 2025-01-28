// src/app/api/stores/[id]/staff/route.ts
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

    const staff = await prisma.user.findMany({
      where: { 
        storeId: params.id 
      },
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

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const staff = await prisma.user.create({
      data: {
        ...body,
        storeId: params.id
      },
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

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff creation error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}