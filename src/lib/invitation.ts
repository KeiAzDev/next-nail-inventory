// src/lib/invitation.ts
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export class InvitationError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = 'InvitationError';
  }
}

// トークン生成関数
export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

// 有効期限の計算（24時間）
export function calculateExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);
  return expiryDate;
}

// トークン検証関数
export async function validateInvitationToken(
  token: string,
  tx: PrismaClient | any = prisma
): Promise<{ isValid: boolean; invitation?: any; error?: string }> {
  try {
    const invitation = await tx.invitation.findUnique({
      where: { token },
      include: { store: true }
    });

    if (!invitation) {
      return { isValid: false, error: '招待が見つかりません' };
    }

    if (invitation.used) {
      return { isValid: false, error: 'この招待は既に使用されています' };
    }

    if (new Date() > invitation.expires) {
      return { isValid: false, error: '招待の有効期限が切れています' };
    }

    return { isValid: true, invitation };
  } catch (error) {
    console.error('招待トークン検証エラー:', error);
    return { isValid: false, error: '検証中にエラーが発生しました' };
  }
}

// エラーレスポンス生成関数
export function createErrorResponse(error: InvitationError | Error, status = 400) {
  return NextResponse.json(
    { error: error.message },
    { status: error instanceof InvitationError ? error.status : status }
  );
}