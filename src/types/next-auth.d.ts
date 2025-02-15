// src/types/next-auth.d.ts
import 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      storeId: string
      sessionToken: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    storeId: string
    sessionToken: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    storeId: string
    sessionToken: string
  }
}