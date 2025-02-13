// /src/components/profile/profile-settings.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { fetchStaffProfile, updateStaffProfile } from '@/lib/api-client'
import type { UpdateStaffProfileRequest } from '@/types/api'
import ProfileActivityLog from './profile-activity-log'

export default function ProfileSettings() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['staffProfile', session?.user.storeId, session?.user.id],
    queryFn: () => fetchStaffProfile(session!.user.storeId, session!.user.id),
    enabled: !!session?.user.id
  })

  const { mutate: updateProfile } = useMutation({
    mutationFn: (data: UpdateStaffProfileRequest) =>
      updateStaffProfile(session!.user.storeId, session!.user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staffProfile', session?.user.storeId, session?.user.id]
      })
      toast({
        title: '更新完了',
        description: 'プロフィールを更新しました'
      })
    }
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              value={profile?.name || ''}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* アクティビティログ */}
      <ProfileActivityLog />
    </div>
  )
}