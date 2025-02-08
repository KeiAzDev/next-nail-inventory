// src/app/api/climate-data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY

interface OpenWeatherResponse {
  main: {
    temp: number
    humidity: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')

    if (!lat || !lon) {
      return NextResponse.json(
        { 
          error: '位置情報が必要です',
          debug: { 
            receivedParams: { lat, lon },
            url: request.url 
          }
        },
        { status: 400 }
      )
    }

    // この部分は変更なし（OpenWeatherMap APIの呼び出し）
    if (!OPENWEATHER_API_KEY) {
      console.warn('OpenWeather API key is not set');
      throw new Error('OpenWeather API key is not configured');
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Weather API request failed')
    }

    const data: OpenWeatherResponse = await response.json()

    return NextResponse.json({
      temperature: data.main.temp,
      humidity: data.main.humidity,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Climate data fetch error:', error)
    return NextResponse.json(
      { 
        error: '気温・湿度データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}