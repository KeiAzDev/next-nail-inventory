//src/components/modals/staff-role-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { updateStaffRole } from '@/lib/api-client'
import type { StaffMember, UpdateStaffRoleRequest } from '@/types/api'

interface StaffRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember
  storeId: string
}

const roleLabels = {
  MANAGER: 'マネージャー',
  STAFF: 'スタッフ'
} as const

export default function StaffRoleModal({
  open,
  onOpenChange,
  staff,
  storeId
}: StaffRoleModalProps) {
  const [role, setRole] = useState<'MANAGER' | 'STAFF'>(staff.role === 'ADMIN' ? 'MANAGER' : staff.role)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setRole(staff.role === 'ADMIN' ? 'MANAGER' : staff.role)
    }
  }, [open, staff])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: UpdateStaffRoleRequest) =>
      updateStaffRole(storeId, staff.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
      toast({
        title: '更新完了',
        description: 'スタッフの権限を更新しました',
      })
      onOpenChange(false)
    },
    onError: () => {
      toast({
        title: 'エラー',
        description: '権限の更新に失敗しました',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ role })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-sm text-gray-800">
        <DialogHeader>
          <DialogTitle>権限変更</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">権限</Label>
            <Select
              value={role}
              onValueChange={(value: 'MANAGER' | 'STAFF') => setRole(value)}
            >
              <SelectTrigger>
                <SelectValue>{roleLabels[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">{roleLabels.MANAGER}</SelectItem>
                <SelectItem value="STAFF">{roleLabels.STAFF}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="default"
              onClick={() => onOpenChange(false)}
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