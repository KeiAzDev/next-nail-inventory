// src/app/api/stores/[id]/invitations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// ロールベースの権限チェック
function canManageInvitations(userRole: string, requestedRole: string): boolean {
  // 店舗管理者は店舗内の全てのロールを付与可能
  if (userRole === 'ADMIN') return true;
  
  // マネージャーはスタッフのみ招待可能
  if (userRole === 'MANAGER' && requestedRole === 'STAFF') return true;
  
  return false;
}

// トークン生成
function generateInvitationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 32;
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 有効期限の計算（24時間）
function calculateExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);
  return expiryDate;
}

/**
 * 招待作成API
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    // パラメータの解決
    const resolvedParams = await context.params;
    const storeId = resolvedParams.id;

    // 所属店舗の確認
    if (session.user.storeId !== storeId) {
      return new NextResponse('この店舗へのアクセス権限がありません', { status: 403 });
    }

    // リクエストボディの取得
    const body = await request.json();
    const { email, role = 'STAFF' } = body;

    // メールアドレスのバリデーション
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: '有効なメールアドレスを指定してください' },
        { status: 400 }
      );
    }

    // ロールのバリデーション
    if (!['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
      return NextResponse.json(
        { error: '無効なロールが指定されました' },
        { status: 400 }
      );
    }

    // ロール付与の権限チェック
    if (!canManageInvitations(session.user.role, role)) {
      return new NextResponse(
        'このロールでの招待を作成する権限がありません',
        { status: 403 }
      );
    }

    // 店舗の存在確認
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      );
    }

    // 既存の有効な招待がないかチェック
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        storeId,
        used: false,
        expires: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'このメールアドレスへの有効な招待が既に存在します' },
        { status: 400 }
      );
    }

    // トークンと有効期限の生成
    const token = generateInvitationToken();
    const expires = calculateExpiryDate();

    // 招待の作成
    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        role: role as Role,
        expires,
        store: { connect: { id: storeId } }
      }
    });

    // 招待URLの生成
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/staff-signup?token=${token}`;

    return NextResponse.json({ invitation, inviteUrl });

  } catch (error) {
    console.error('招待作成エラー:', error);
    return NextResponse.json(
      { error: '招待の作成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 招待一覧取得API
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    // パラメータの解決
    const resolvedParams = await context.params;
    const storeId = resolvedParams.id;

    // 所属店舗の確認
    if (session.user.storeId !== storeId) {
      return new NextResponse('この店舗へのアクセス権限がありません', { status: 403 });
    }

    // スタッフは招待一覧を閲覧できない
    if (session.user.role === 'STAFF') {
      return new NextResponse('この操作を行う権限がありません', { status: 403 });
    }

    // 有効な招待の取得
    const invitations = await prisma.invitation.findMany({
      where: {
        storeId,
        expires: { gt: new Date() },
        used: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ invitations });

  } catch (error) {
    console.error('招待一覧取得エラー:', error);
    return NextResponse.json(
      { error: '招待一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 招待の削除API
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    // パラメータの解決
    const resolvedParams = await context.params;
    const storeId = resolvedParams.id;

    // 所属店舗の確認
    if (session.user.storeId !== storeId) {
      return new NextResponse('この店舗へのアクセス権限がありません', { status: 403 });
    }

    // スタッフは招待を削除できない
    if (session.user.role === 'STAFF') {
      return new NextResponse('この操作を行う権限がありません', { status: 403 });
    }

    // リクエストボディからトークンを取得
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが指定されていません' },
        { status: 400 }
      );
    }

    // 招待の存在確認
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        storeId,
        used: false,
        expires: { gt: new Date() }
      }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: '有効な招待が見つかりません' },
        { status: 404 }
      );
    }

    // 招待の削除
    await prisma.invitation.delete({
      where: { token }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('招待削除エラー:', error);
    return NextResponse.json(
      { error: '招待の削除に失敗しました' },
      { status: 500 }
    );
  }
}