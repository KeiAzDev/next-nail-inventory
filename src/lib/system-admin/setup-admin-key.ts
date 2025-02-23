// src/lib/system-admin/setup-admin-key.ts
import { prisma } from '../prisma' 
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'

interface SetupOptions {
  allowedIPs?: string[];
  environment?: 'development' | 'production';
}

async function setupAdminKey(options: SetupOptions = {}) {
  try {
    const environment = options.environment || process.env.NODE_ENV || 'development'
    
    console.log(`システム管理者キーの作成を開始します... (環境: ${environment})`)
    
    // より強力なキー生成（本番環境用）
    const generateSecureKey = () => {
      if (environment === 'production') {
        // 本番環境: 64バイトの暗号論的に安全な乱数を使用
        return crypto.randomBytes(64).toString('hex')
      } else {
        // 開発環境: 既存の形式を維持
        return process.env.SYSTEM_ADMIN_KEY || `admin-${uuidv4()}`
      }
    }

    // すべてのIPを許可する設定
    const defaultAllowedIPs = ['*']

    const adminKey = generateSecureKey()
    
    // 既存のキーを検索
    const existingKey = await prisma.systemAdminKey.findFirst()
    
    if (existingKey) {
      console.log('既存の管理者キーが見つかりました。ID:', existingKey.id)
      console.log('新しいキーで更新します。')
      
      const updated = await prisma.systemAdminKey.update({
        where: { id: existingKey.id },
        data: {
          key: await bcrypt.hash(adminKey, 12),
          allowedIPs: defaultAllowedIPs,
          attempts: 0,
          lastRotated: new Date()
        }
      })
      
      console.log('管理者キーを更新しました。ID:', updated.id)
    } else {
      const systemAdminUserId = new ObjectId().toString()

      const created = await prisma.systemAdminKey.create({
        data: {
          userId: systemAdminUserId,
          key: await bcrypt.hash(adminKey, 12),
          allowedIPs: defaultAllowedIPs,
          attempts: 0
        }
      })
      
      console.log('新しい管理者キーを作成しました。ID:', created.id)
    }
    
    console.log('===============================')
    console.log('環境:', environment)
    console.log('管理者キー:', adminKey)
    console.log('許可IP:', defaultAllowedIPs.join(', '))
    console.log('===============================')
    console.log('【重要】')
    console.log('このキーを.envファイルのSYSTEM_ADMIN_KEYに設定してください。')
    console.log('===============================')

    return {
      key: adminKey,
      allowedIPs: defaultAllowedIPs,
      environment
    }
    
  } catch (error) {
    console.error('管理者キーの設定中にエラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 本番環境用にキーを生成
setupAdminKey({
  environment: 'production'
})