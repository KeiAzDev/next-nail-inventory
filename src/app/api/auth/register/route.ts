import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Role, Prisma } from '@prisma/client'
import { createDefaultServiceTypes, ServiceTypeError } from '@/lib/service-types/create-defaults'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      storeName, 
      storeCode, 
      address, 
      phone, 
      adminEmail,
      adminName,
      password 
    } = body

    // バリデーション
    if (!storeName || !storeCode || !adminEmail || !adminName || !password) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // 店舗コードの重複チェック
    const existingStore = await prisma.store.findUnique({
      where: { code: storeCode }
    })

    if (existingStore) {
      return NextResponse.json(
        { error: 'この店舗コードは既に使用されています' },
        { status: 400 }
      )
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // トランザクションで店舗、管理者、デフォルト施術タイプを作成
    const result = await prisma.$transaction(async (tx) => {
      // 店舗の作成
      const store = await tx.store.create({
        data: {
          name: storeName,
          code: storeCode,
          address,
          phone,
          adminEmail
        }
      })

      // 管理者ユーザーの作成
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: Role.ADMIN,
          storeId: store.id
        }
      })

      // デフォルト施術タイプの作成
      const serviceTypes = await createDefaultServiceTypes(tx, store.id)

      return { store, admin, serviceTypes }
    }, {
      maxWait: 10000, // トランザクションのタイムアウト設定: 10秒
      timeout: 30000  // 全体の実行タイムアウト: 30秒
    })

    return NextResponse.json({
      message: '店舗、管理者アカウント、基本設定が作成されました',
      storeId: result.store.id
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    // エラーの種類に応じた適切なレスポンス
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'データベース処理中にエラーが発生しました' },
        { status: 500 }
      )
    }

    if (error instanceof ServiceTypeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '登録処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}