// /src/app/(dashboard)/profile/page.tsx
import { requireAuth } from '@/lib/auth'
import ProfileSettings from '@/components/profile/profile-settings'

export default async function ProfilePage() {
  const session = await requireAuth()
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">プロフィール設定</h1>
      <ProfileSettings />
    </div>
  )
}