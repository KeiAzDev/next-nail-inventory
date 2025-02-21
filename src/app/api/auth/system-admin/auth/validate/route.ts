// src/app/api/system-admin/auth/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SystemAdminAuth } from '@/lib/system-admin/auth';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'トークンは必須です' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  '0.0.0.0';
    const auth = new SystemAdminAuth();
    
    const isValid = await auth.validateSession(token, ipAddress);
    
    return NextResponse.json({ valid: isValid }, { status: 200 });
  } catch (error) {
    console.error('System admin session validation error:', error);
    
    return NextResponse.json(
      { valid: false, error: '検証処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}