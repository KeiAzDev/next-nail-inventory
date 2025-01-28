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

    const products = await prisma.product.findMany({
      where: { storeId: params.id }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Products fetch error:', error)
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
    const product = await prisma.product.create({
      data: {
        ...body,
        storeId: params.id
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product creation error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}