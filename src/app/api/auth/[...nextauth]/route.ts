// src/app/api/auth/[...nextauth]/route.ts
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SessionManager } from '@/lib/session-manager'
import { SessionError } from '@/lib/errors'
import type { RequestInternal } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { SessionCleanupService } from '@/lib/session-cleanup-service'

// クリーンアップサービスの起動（本番環境のみ）
if (process.env.NODE_ENV === 'production') {
  SessionCleanupService.getInstance().startCleanupSchedule()
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req: Pick<RequestInternal, "headers" | "body" | "query" | "method">) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          throw new Error('認証情報が不足しています')
        }
      
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              store: true
            }
          })

          console.log('User authentication attempt:', {
            email: credentials.email,
            userFound: !!user,
            isDeleted: user?.isDeleted
          })
      
          if (!user || !user.password) {
            throw new Error('ユーザーが見つかりません')
          }
      
          if (user.isDeleted) {
            throw new Error('このアカウントは削除されています')
          }
      
          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) {
            throw new Error('パスワードが正しくありません')
          }
      
          // セッション管理を初期化
          const sessionManager = new SessionManager(user.storeId)
          try {
            const sessionInfo = {
              device: req.headers?.['user-agent'] || undefined,
              ipAddress: req.headers?.['x-forwarded-for']?.toString() || undefined
            }

            console.log('Attempting to create session:', {
              userId: user.id,
              storeId: user.storeId,
              sessionInfo
            })
      
            const session = await sessionManager.createSession(user.id, sessionInfo)
      
            // ログイン回数と最終ログイン時刻を更新
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginCount: { increment: 1 },
                lastLogin: new Date()
              }
            })
      
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              storeId: user.storeId,
              sessionToken: session.token
            }
          } catch (error) {
            console.error('Session creation error in authorize:', error)
            
            if (error instanceof SessionError) {
              throw new Error(error.message)
            }
            throw new Error('ログイン処理中にエラーが発生しました')
          }
        } catch (error) {
          console.error('Authorization error:', error)
          
          if (error instanceof Error) {
            throw error
          }
          throw new Error('認証中にエラーが発生しました')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.storeId = user.storeId
        token.sessionToken = user.sessionToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.storeId = token.storeId as string
        session.user.sessionToken = token.sessionToken as string
      }
      return session
    }
  },
  events: {
    async signOut({ token }: { token: JWT }) {
      if (token?.storeId && token?.sessionToken) {
        try {
          const sessionManager = new SessionManager(token.storeId as string)
          await sessionManager.invalidateSession(token.sessionToken as string)
        } catch (error) {
          console.error('Session invalidation error:', error)
        }
      }
    }
  },
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24時間
  },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, ...message) {
      console.error(code, ...message)
    },
    warn(code, ...message) {
      console.warn(code, ...message)
    },
    debug(code, ...message) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(code, ...message)
      }
    }
  },
  debug: false
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }