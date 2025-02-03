// app/api/staff/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { validateInvitationToken } from '@/lib/invitation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, token } = body

    // バリデーション
    if (!name || !password || !token) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // トークンの検証
    const { isValid, invitation, error } = await validateInvitationToken(token)

    if (!isValid || !invitation) {
      return NextResponse.json(
        { error: error || '無効な招待です' },
        { status: 400 }
      )
    }

    // 招待情報の確認
    if (invitation.used) {
      return NextResponse.json(
        { error: 'この招待は既に使用されています' },
        { status: 400 }
      )
    }

    // メールアドレスの一致確認
    if (invitation.email && invitation.email !== email) {
      return NextResponse.json(
        { error: '招待されたメールアドレスと一致しません' },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // トランザクションでユーザー作成と招待状態の更新を実行
    const result = await prisma.$transaction(async (tx) => {
      // スタッフの作成
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: invitation.role,
          storeId: invitation.storeId
        }
      })

      // 招待を使用済みに更新
      await tx.invitation.update({
        where: { token },
        data: { used: true }
      })

      return user
    })

    // パスワードを除外してレスポンスを返す
    const { password: _, ...userWithoutPassword } = result

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('Staff registration error:', error)
    return NextResponse.json(
      { error: 'スタッフの登録に失敗しました' },
      { status: 500 }
    )
  }
}