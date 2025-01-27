import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      storeId: string
    }
  }
  
  interface User {
    role: string
    storeId: string
  }
}