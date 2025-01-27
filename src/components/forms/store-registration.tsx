'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  storeName: string
  storeCode: string
  address: string
  phone: string
  adminEmail: string
  adminName: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  [key: string]: string
}

export default function StoreRegistrationForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    storeName: '',
    storeCode: '',
    address: '',
    phone: '',
    adminEmail: '',
    adminName: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.storeName) {
      newErrors.storeName = '店舗名は必須です'
    }
    if (!formData.storeCode) {
      newErrors.storeCode = '店舗コードは必須です'
    }
    if (!formData.adminEmail) {
      newErrors.adminEmail = 'メールアドレスは必須です'
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = '有効なメールアドレスを入力してください'
    }
    if (!formData.adminName) {
      newErrors.adminName = '管理者名は必須です'
    }
    if (!formData.password) {
      newErrors.password = 'パスワードは必須です'
    } else if (formData.password.length < 8) {
      newErrors.password = 'パスワードは8文字以上である必要があります'
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
    // 入力時にエラーをクリア
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: formData.storeName,
          storeCode: formData.storeCode,
          address: formData.address,
          phone: formData.phone,
          adminEmail: formData.adminEmail,
          adminName: formData.adminName,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました')
      }

      // 登録成功後、サインインページへリダイレクト
      router.push('/signin?registered=true')
    } catch (error) {
      setApiError(error instanceof Error ? error.message : '登録中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
          店舗名 *
        </label>
        <input
          type="text"
          id="storeName"
          name="storeName"
          value={formData.storeName}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.storeName ? 'border-red-300' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
        />
        {errors.storeName && (
          <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>
        )}
      </div>

      <div>
        <label htmlFor="storeCode" className="block text-sm font-medium text-gray-700">
          店舗コード *
        </label>
        <input
          type="text"
          id="storeCode"
          name="storeCode"
          value={formData.storeCode}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.storeCode ? 'border-red-300' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
        />
        {errors.storeCode && (
          <p className="mt-1 text-sm text-red-600">{errors.storeCode}</p>
        )}
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          住所
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          電話番号
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
          管理者メールアドレス *
        </label>
        <input
          type="email"
          id="adminEmail"
          name="adminEmail"
          value={formData.adminEmail}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.adminEmail ? 'border-red-300' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
        />
        {errors.adminEmail && (
          <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>
        )}
      </div>

      <div>
        <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">
          管理者名 *
        </label>
        <input
          type="text"
          id="adminName"
          name="adminName"
          value={formData.adminName}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md ${
            errors.adminName ? 'border-red-300' : 'border-gray-300'
          } shadow-sm focus:border-indigo-500 focus:ring-indigo-500`}
        />
        {errors.adminName && (
          <p className="mt-1 text-sm text-red-600">{errors.adminName}</p>
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

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? '登録中...' : '登録する'}
      </button>
    </form>
  )
}