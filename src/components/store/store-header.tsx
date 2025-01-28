'use client'

import { useQuery } from '@tanstack/react-query'
import { Store } from '@/types/api'
import { useSession } from 'next-auth/react'
import { fetchStoreDetails } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Phone, Mail, UserCircle } from 'lucide-react'

interface StoreHeaderProps {
  storeId: string
}

export default function StoreHeader({ storeId }: StoreHeaderProps) {
  const { data: session } = useSession()
  const { data: store, error, isLoading } = useQuery<Store>({
    queryKey: ['store', storeId],
    queryFn: () => fetchStoreDetails(storeId)
  })

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="h-32" />
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          店舗情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  if (!store) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* 店舗情報 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-2xl font-bold">{store.name}</h2>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              {store.address && (
                <p>{store.address}</p>
              )}
              {store.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{store.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{store.adminEmail}</span>
              </div>
            </div>
          </div>

          {/* ログインユーザー情報 */}
          <div className="flex items-start justify-end gap-3">
            <div className="text-right">
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
            <UserCircle className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}