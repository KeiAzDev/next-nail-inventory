//src/app/(auth)/staff-signup/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { validateInvitation } from '@/lib/api-client'
import type { ValidateInvitationResponse } from '@/types/api'
import StaffRegistrationForm from '@/components/forms/staff-registration'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading'

export default function StaffSignUpPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const { 
    data, 
    error, 
    isLoading 
  } = useQuery<ValidateInvitationResponse>({
    queryKey: ['invitation-validate', token],
    queryFn: async () => {
      if (!token) throw new Error('トークンが指定されていません')
      return validateInvitation(token)
    },
    enabled: !!token
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !data?.isValid || !data.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 ">
        <Alert variant="destructive" className="max-w-md text-gray-800">
          <AlertDescription>
            {data?.error || '無効な招待リンクです。有効期限が切れているか、すでに使用されている可能性があります。'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <StaffRegistrationForm 
            store={{
              id: data.invitation.storeId,
              name: data.invitation.storeName,
              code: data.invitation.storeId,
              adminEmail: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }}
            invitationToken={token}
            invitedEmail={data.invitation.email}
            invitedRole={data.invitation.role}
          />
        </div>
      </div>
    </div>
  )
}