// src/lib/system-admin/setup-admin-key.ts
import { prisma } from '../../prisma'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'

async function setupAdminKey() {
  try {
    // 開発環境用の管理者キーを生成
    const adminKey = process.env.SYSTEM_ADMIN_KEY || `admin-${uuidv4()}`
    
    console.log('システム管理者キーの作成を開始します...')
    
    // 既存のキーを検索
    const existingKey = await prisma.systemAdminKey.findFirst()
    
    if (existingKey) {
      console.log('既存の管理者キーが見つかりました。ID:', existingKey.id)
      console.log('新しいキーで更新します。')
      
      const updated = await prisma.systemAdminKey.update({
        where: { id: existingKey.id },
        data: {
          key: await bcrypt.hash(adminKey, 10),
          allowedIPs: ['127.0.0.1', '::1'], // ローカル開発用
          attempts: 0,
          lastRotated: new Date()
        }
      })
      
      console.log('管理者キーを更新しました。ID:', updated.id)
    } else {
      // システム管理者用のユーザーIDを生成（MongoDB ObjectId形式）
      const systemAdminUserId = new ObjectId().toString()

      // 新規作成
      const created = await prisma.systemAdminKey.create({
        data: {
          userId: systemAdminUserId,
          key: await bcrypt.hash(adminKey, 10),
          allowedIPs: ['127.0.0.1', '::1'], // ローカル開発用
          attempts: 0
        }
      })
      
      console.log('新しい管理者キーを作成しました。ID:', created.id)
    }
    
    console.log('===============================')
    console.log('管理者キー:', adminKey)
    console.log('このキーを環境変数 SYSTEM_ADMIN_KEY に設定するか、')
    console.log('テスト時に直接使用してください。')
    console.log('===============================')
    
  } catch (error) {
    console.error('管理者キーの設定中にエラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAdminKey()