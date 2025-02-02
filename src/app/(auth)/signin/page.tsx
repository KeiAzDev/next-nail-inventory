'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const storeCode = formData.get('storeCode') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        storeCode,
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        toast({
          title: 'エラー',
          description: '認証に失敗しました。入力内容を確認してください。',
          variant: 'destructive',
        })
        return
      }

      // 認証成功後、該当店舗のダッシュボードへリダイレクト
      const session = await fetch('/api/auth/session')
      const sessionData = await session.json()
      
      if (sessionData?.user?.storeId) {
        router.push(`/stores/${sessionData.user.storeId}`)
        router.refresh()
      } else {
        toast({
          title: 'エラー',
          description: '店舗情報の取得に失敗しました',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'エラーが発生しました。時間をおいて再度お試しください。',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg text-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl">店舗ログイン</CardTitle>
          <CardDescription>
            店舗コード、メールアドレス、パスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeCode">店舗コード</Label>
              <Input
                id="storeCode"
                name="storeCode"
                placeholder="例：STORE001"
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}