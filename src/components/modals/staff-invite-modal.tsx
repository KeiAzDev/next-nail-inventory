//src/components/modals/invitation-modal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createStaffInvitation } from '@/lib/api-client'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from 'next-auth/react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

interface InvitationModalProps {
  storeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  email: string
  role: Role
}

const roleOptions = [
  { label: 'スタッフ', value: 'STAFF' },
  { label: 'マネージャー', value: 'MANAGER' },
  { label: '管理者', value: 'ADMIN' }
] as const

export default function InvitationModal({
  storeId,
  open,
  onOpenChange
}: InvitationModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: 'STAFF'
  })

  // Role options based on user's role
  const availableRoles = roleOptions.filter(option => {
    if (session?.user.role === 'ADMIN') return true
    if (session?.user.role === 'MANAGER') return option.value === 'STAFF'
    return false
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await createStaffInvitation(storeId, data)
    },
    onSuccess: async (data) => {
      // Copy invitation URL to clipboard
      await navigator.clipboard.writeText(data.inviteUrl)
      
      // Show success toast
      toast({
        title: '招待URLを作成しました',
        description: 'URLをクリップボードにコピーしました',
      })

      // Reset form and close modal
      setFormData({ email: '', role: 'STAFF' })
      onOpenChange(false)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['invitations', storeId] })
      router.refresh()
    },
    onError: (error) => {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '招待の作成に失敗しました',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!formData.email) {
      toast({
        title: 'エラー',
        description: 'メールアドレスを入力してください',
        variant: 'destructive'
      })
      return
    }

    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white text-gray-800">
        <DialogHeader>
          <DialogTitle>スタッフを招待</DialogTitle>
          <DialogDescription>
            招待URLを作成して共有してください。URLの有効期限は24時間です。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          {availableRoles.length > 1 && (
            <div className="space-y-2">
              <Label>権限</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, role: value as Role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-x-2">
            <Button
            className=' bg-white text-gray-800'
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? '作成中...' : '招待URLを作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}