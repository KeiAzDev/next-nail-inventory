import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// サーバーサイドでの認証チェック
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/signin')
  }
  
  return session
}

// 店舗アクセス権限の確認
export async function validateStoreAccess(storeId: string) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/signin')
  }

  if (session.user.storeId !== storeId && session.user.role !== 'ADMIN') {
    redirect(`/stores/${session.user.storeId}`)
  }
  
  return session
}

// リダイレクト先の取得
export async function getDefaultRedirect() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.storeId) {
    redirect('/signin')
  }
  
  return `/stores/${session.user.storeId}`
}