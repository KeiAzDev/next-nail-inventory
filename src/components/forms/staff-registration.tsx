//src/components/forms/staff-registration.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Store } from '@/types/api'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  [key: string]: string
}

interface StaffRegistrationFormProps {
  store: Store
}

export default function StaffRegistrationForm({ store }: StaffRegistrationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name) {
      newErrors.name = 'お名前は必須です'
    }
    if (!formData.email) {
      newErrors.email = 'メールアドレスは必須です'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください'
    }
    if (!formData.password) {
      newErrors.password = 'パスワードは必須です'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      // スタッフ登録APIの呼び出し
      const response = await fetch('/api/staff/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          storeId: store.id
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '登録に失敗しました')
      }

      // 登録成功後、自動でサインイン
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error('ログインに失敗しました')
      }

      // ダッシュボードへリダイレクト
      router.push(`/stores/${store.id}`)
      router.refresh()
    } catch (error) {
      setApiError(error instanceof Error ? error.message : '登録中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{store.name}</h2>
        <p className="text-gray-600">スタッフ登録</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {apiError}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            お名前 *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            メールアドレス *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            パスワード *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            パスワード（確認） *
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? '登録中...' : '登録する'}
          </button>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>
            既にアカウントをお持ちの方は{' '}
            <Link href="/signin" className="text-indigo-600 hover:text-indigo-500">
              こちら
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}