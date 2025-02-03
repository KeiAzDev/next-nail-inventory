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
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Role options based on user's role
  const availableRoles = roleOptions.filter(option => {
    if (session?.user.role === 'ADMIN') return true
    if (session?.user.role === 'MANAGER') return option.value === 'STAFF'
    return false
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await createStaffInvitation(storeId, {
        email: data.email,
        role: data.role
      })
    },
    onSuccess: async (data) => {
      setGeneratedUrl(data.inviteUrl)
      await navigator.clipboard.writeText(data.inviteUrl)
      
      toast({
        title: '招待URLを作成しました',
        description: 'URLをクリップボードにコピーしました',
      })

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

  const handleClose = () => {
    setFormData({ email: '', role: 'STAFF' })
    setGeneratedUrl(null)
    onOpenChange(false)
  }

  const handleCopy = async () => {
    if (generatedUrl) {
      try {
        await navigator.clipboard.writeText(generatedUrl)
        setIsCopied(true)
        toast({
          title: 'コピーしました',
          description: 'URLをクリップボードにコピーしました',
        })
        // 2秒後にコピー状態をリセット
        setTimeout(() => setIsCopied(false), 2000)
      } catch (err) {
        toast({
          title: 'コピーに失敗しました',
          description: 'URLを手動でコピーしてください',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white text-gray-800">
        <DialogHeader>
          <DialogTitle>スタッフを招待</DialogTitle>
          <DialogDescription>
            {generatedUrl 
              ? '生成された招待URLをコピーして招待者に共有してください。URLの有効期限は24時間です。'
              : '招待URLを作成して共有してください。URLの有効期限は24時間です。'
            }
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

{generatedUrl && (
  <div className="space-y-2">
    <Label>生成されたURL</Label>
    <div className="flex items-center gap-x-2">
      <Input
        readOnly
        value={generatedUrl}
        className="bg-gray-50"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCopy}
        title={isCopied ? "コピー済み" : "クリックでコピー"} 
        className="flex-shrink-0 text-white bg-blue-500 hover:bg-blue-600"
      >
        {isCopied ? (
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        ) : (
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H5.5C4.67158 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67158 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        )}
      </Button>
    </div>
  </div>
)}

          <div className="flex justify-end gap-x-2">
            <Button
              className="bg-white text-gray-800"
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              {generatedUrl ? '完了' : 'キャンセル'}
            </Button>
            {!generatedUrl && (
              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? '作成中...' : '招待URLを作成'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}