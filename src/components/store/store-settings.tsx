'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Store, Shield } from 'lucide-react'
import { fetchStoreDetails, updateStoreDetails } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'
import type { Store as StoreType } from '@/types/api'
import { useSession } from 'next-auth/react'

interface StoreSettingsProps {
  storeId: string
}

// Query Keyの型定義
const storeQueryKey = (storeId: string) => ({
  queryKey: ['store', storeId] as const
})

export default function StoreSettings({ storeId }: StoreSettingsProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: store, error, isLoading } = useQuery({
    ...storeQueryKey(storeId),
    queryFn: () => fetchStoreDetails(storeId)
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<StoreType>) => updateStoreDetails(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(storeQueryKey(storeId))
      toast({
        title: "設定を保存しました",
        description: "店舗情報が正常に更新されました。",
      })
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: "店舗情報の更新に失敗しました。再度お試しください。",
      })
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  // ローディング状態の表示
  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="h-64" />
      </Card>
    )
  }

  // エラー状態の表示
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          店舗情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
    }

    await mutation.mutateAsync(data)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            <CardTitle>店舗設定</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            <span>{session?.user?.role}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">店舗名</Label>
              <Input
                id="name"
                name="name"
                defaultValue={store?.name}
                placeholder="店舗名を入力"
                disabled={session?.user?.role === 'STAFF'}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="code">店舗コード</Label>
              <Input
                id="code"
                value={store?.code}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">住所</Label>
              <Input
                id="address"
                name="address"
                defaultValue={store?.address ?? ''}
                placeholder="住所を入力"
                disabled={session?.user?.role === 'STAFF'}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={store?.phone ?? ''}
                placeholder="電話番号を入力"
                disabled={session?.user?.role === 'STAFF'}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adminEmail">管理者メールアドレス</Label>
              <Input
                id="adminEmail"
                value={store?.adminEmail}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || session?.user?.role === 'STAFF'}
            >
              {isSubmitting ? '保存中...' : '設定を保存'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}