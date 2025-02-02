import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  // セッションがある場合は適切なページにリダイレクト
  const session = await getServerSession()
  if (session?.user?.storeId) {
    redirect(`/stores/${session.user.storeId}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg text-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            ネイルサロン在庫管理システム
          </CardTitle>
          <CardDescription className="text-center">
            店舗ごとの在庫管理をシンプルに
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">店舗をお持ちの方</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="default" asChild>
                  <Link href="/signup">店舗登録</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/signin" className="text-white">店舗ログイン</Link>
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              ※スタッフの方は店舗管理者から提供された<br />
              登録用URLからアカウントを作成してください
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}