// src/app/api/stores/invitations/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationToken, createErrorResponse } from '@/lib/invitation';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return createErrorResponse(new Error('トークンが指定されていません'), 400);
    }

    const { isValid, invitation, error } = await validateInvitationToken(token);

    if (!isValid) {
      return createErrorResponse(new Error(error || '無効なトークンです'), 400);
    }

    return NextResponse.json({
      invitation: {
        storeId: invitation.store.id,
        storeName: invitation.store.name,
        role: invitation.role,
        email: invitation.email
      }
    });
  } catch (error) {
    console.error('トークン検証エラー:', error);
    return createErrorResponse(error as Error);
  }
}