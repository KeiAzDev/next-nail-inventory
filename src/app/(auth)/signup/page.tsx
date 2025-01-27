import StoreRegistrationForm from '@/components/forms/store-registration'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          店舗登録
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          既にアカウントをお持ちですか？{' '}
          <Link href="/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
            サインイン
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <StoreRegistrationForm />
        </div>
      </div>
    </div>
  )
}