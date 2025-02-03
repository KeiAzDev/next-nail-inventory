//src/components/store/store-invitation-list.tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { format, isPast } from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import type { Locale } from 'date-fns'
import { Trash2, Clock, Mail, Shield } from 'lucide-react'
import { getStoreInvitations, deleteInvitation } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'
import { LoadingSpinner } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { Invitation } from '@/types/api'

interface InvitationListProps {
  storeId: string
}

const roleLabels = {
  ADMIN: '管理者',
  MANAGER: 'マネージャー',
  STAFF: 'スタッフ'
} as const

export default function InvitationList({ storeId }: InvitationListProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 権限チェック
  const canManageInvitations = session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER'

  // 招待一覧の取得
  const { 
    data: invitations, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['invitations', storeId],
    queryFn: () => getStoreInvitations(storeId),
    enabled: !!canManageInvitations
  })

  // 招待削除のミューテーション
  const deleteMutation = useMutation({
    mutationFn: (token: string) => deleteInvitation(storeId, token),
    onSuccess: () => {
      // キャッシュの更新
      queryClient.invalidateQueries({ queryKey: ['invitations', storeId] })
      toast({
        title: '招待を削除しました',
      })
    },
    onError: (error) => {
      toast({
        title: 'エラー',
        description: '招待の削除に失敗しました',
        variant: 'destructive',
      })
    }
  })

  // ローディング状態
  if (isLoading) {
    return <LoadingSpinner className="my-4" />
  }

  // エラー状態
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          招待情報の取得に失敗しました
        </AlertDescription>
      </Alert>
    )
  }

  // 権限がない場合
  if (!canManageInvitations) {
    return null
  }

  // 有効な招待がない場合
  if (!invitations?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        有効な招待はありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => {
        const isExpired = isPast(new Date(invitation.expires))
        
        return (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-white"
          >
            {/* 招待情報 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{invitation.email}</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>{roleLabels[invitation.role]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    有効期限: {format(new Date(invitation.expires), 'M月d日 HH:mm', { locale: ja })}
                  </span>
                  {isExpired && (
                    <span className="text-red-500 ml-2">
                      (期限切れ)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 操作ボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-500"
              onClick={() => {
                if (window.confirm('この招待を削除してもよろしいですか？')) {
                  deleteMutation.mutate(invitation.token)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}