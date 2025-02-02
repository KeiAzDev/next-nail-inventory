// app/(auth)/staff-signup/layout.tsx
import QueryProvider from '@/components/providers/query-provider'

export default function StaffSignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <QueryProvider>{children}</QueryProvider>
}