// src/app/api/stores/invitations/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationToken, createErrorResponse } from '@/lib/invitation';
import type { ValidateInvitationResponse } from '@/types/api';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json<ValidateInvitationResponse>({
        isValid: false,
        error: 'トークンが指定されていません'
      }, { status: 400 });
    }

    const { isValid, invitation, error } = await validateInvitationToken(token);

    if (!isValid || !invitation) {
      return NextResponse.json<ValidateInvitationResponse>({
        isValid: false,
        error: error || '無効なトークンです'
      }, { status: 400 });
    }

    return NextResponse.json<ValidateInvitationResponse>({
      isValid: true,
      invitation: {
        storeId: invitation.store.id,
        storeName: invitation.store.name,
        role: invitation.role,
        email: invitation.email
      }
    });

  } catch (error) {
    console.error('トークン検証エラー:', error);
    return NextResponse.json<ValidateInvitationResponse>({
      isValid: false,
      error: '検証中にエラーが発生しました'
    }, { status: 500 });
  }
}