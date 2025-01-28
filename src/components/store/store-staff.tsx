'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Plus, UserCircle, Shield, Mail } from 'lucide-react'
import { fetchStoreStaff } from '@/lib/api-client'
import type { StaffMember } from '@/types/api'

interface StoreStaffProps {
  storeId: string
}

// 権限レベルに応じたバッジの色を定義
const roleBadgeColors = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  STAFF: 'bg-gray-100 text-gray-800'
} as const

// 権限の日本語表示
const roleLabels = {
  ADMIN: '管理者',
  MANAGER: 'マネージャー',
  STAFF: 'スタッフ'
} as const

export default function StoreStaff({ storeId }: StoreStaffProps) {
  const { data: staffMembers, error, isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff', storeId],
    queryFn: () => fetchStoreStaff(storeId)
  })

  if (isLoading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="h-64" />
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          スタッフ情報の取得に失敗しました。再度お試しください。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>スタッフ管理</CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            スタッフ招待
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {staffMembers?.map(staff => (
            <div
              key={staff.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <UserCircle className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{staff.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{staff.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm ${roleBadgeColors[staff.role]}`}>
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>{roleLabels[staff.role]}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {staffMembers?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              スタッフが登録されていません
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}