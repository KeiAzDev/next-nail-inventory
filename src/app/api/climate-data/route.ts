import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// モックデータ（実際の環境データ取得APIに置き換え予定）
const MOCK_CLIMATE_DATA = {
  temperature: 22,  // 22度
  humidity: 50,    // 50%
  timestamp: new Date().toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 本番環境では実際の気象データAPIに接続
    // 現在はモックデータを返す
    return NextResponse.json(MOCK_CLIMATE_DATA)
  } catch (error) {
    console.error('Climate data fetch error:', error)
    return NextResponse.json(
      { error: '気温・湿度データの取得に失敗しました' },
      { status: 500 }
    )
  }
}