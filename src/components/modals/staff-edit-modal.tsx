//src/components/modals/staff-edit-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { updateStaffDetails } from '@/lib/api-client'
import type { StaffMember, UpdateStaffRequest } from '@/types/api'

interface StaffEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember
  storeId: string
}

export default function StaffEditModal({
  open,
  onOpenChange,
  staff,
  storeId
}: StaffEditModalProps) {
  const [name, setName] = useState(staff.name)
  const [email, setEmail] = useState(staff.email)
  const [password, setPassword] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setName(staff.name)
      setEmail(staff.email)
      setPassword('')
    }
  }, [open, staff])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: UpdateStaffRequest) => 
      updateStaffDetails(storeId, staff.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
      toast({
        title: '更新完了',
        description: 'スタッフ情報を更新しました',
      })
      onOpenChange(false)
    },
    onError: () => {
      toast({
        title: 'エラー',
        description: '更新に失敗しました',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: UpdateStaffRequest = {
      name,
      email,
    }
    if (password) {
      data.password = password
    }
    mutate(data)
  }

  const handleClose = () => {
    setName(staff.name)
    setEmail(staff.email)
    setPassword('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-sm text-gray-800">
        <DialogHeader>
          <DialogTitle>スタッフ情報編集</DialogTitle>
          <DialogDescription>
            スタッフの基本情報を編集できます。パスワードは変更する場合のみ入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名前</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              パスワード
              <span className="text-sm text-muted-foreground ml-2">
                (変更する場合のみ入力)
              </span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="default"
              onClick={handleClose}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '更新中...' : '更新'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}