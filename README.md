This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Nail Salon Inventory Management System

## Project Overview
A multi-tenant inventory management system for nail salons built with Next.js 15, Prisma, MongoDB, and TailwindCSS.

## Key Features
- Multi-tenant architecture with store-level isolation
- Secure authentication system with role-based access control
- Real-time inventory tracking
- Usage analytics and predictions
- Automated stock alerts

## Technical Stack
- **Frontend**: Next.js 15 (App Router)
- **Database**: MongoDB with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: TailwindCSS
- **State Management**: React Query
- **Form Handling**: React Hook Form + Zod
- **Real-time Updates**: Pusher
- **Deployment**: Vercel

## Important Implementation Guidelines

### Route Handling Best Practices
```typescript
// ❌ Avoid using params
export async function generateMetadata({ params }: Props) {
  // This can cause build errors
}

// ✅ Use NextRequest and URL parsing
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Get storeId from URL path
  const pathParts = request.nextUrl.pathname.split('/')
  const storeId = pathParts[2] // Example: /api/stores/123
}
```

### Security Implementation
```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Extract store ID from URL path
  const pathname = request.nextUrl.pathname
  const pathParts = pathname.split('/')
  const storeId = pathParts.includes('stores') ? pathParts[pathParts.indexOf('stores') + 1] : null

  // Verify authentication
  const verifiedToken = await verifyAuth(request)
  if (!verifiedToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify store access
  if (storeId && verifiedToken.storeId !== storeId) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

### Data Access Patterns
```typescript
// lib/prisma/store.ts
import { prisma } from '@/lib/prisma'

export async function getStoreData(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const storeId = pathname.split('/')[2]

  return await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      products: true,
      users: true
    }
  })
}
```

## Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── signin/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── stores/
│   │   │   └── [id]/
│   │   │       ├── inventory/
│   │   │       ├── staff/
│   │   │       └── settings/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── stores/
│   │   ├── products/
│   │   └── users/
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── forms/
│   └── layouts/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   └── utils.ts
├── types/
└── styles/
```

## Development Flow

1. **Initial Setup**
   - Environment configuration
   - Database setup
   - Authentication setup

2. **Core Features Implementation**
   - Store registration system
   - Staff invitation system
   - Inventory management
   - Usage tracking

3. **Advanced Features**
   - Analytics dashboard
   - Prediction system
   - Alert management
   - Backup system

## API Endpoints

### Authentication
```typescript
// POST /api/auth/register-store
interface RegisterStoreBody {
  name: string
  adminEmail: string
  code: string
}

// POST /api/auth/invite-staff
interface InviteStaffBody {
  email: string
  role: Role
  storeId: string
}
```

### Inventory Management
```typescript
// GET /api/stores/[storeId]/products
// POST /api/stores/[storeId]/products
interface ProductBody {
  brand: string
  productName: string
  colorCode: string
  colorName: string
  type: Type
  price: number
  quantity: number
  minStockAlert: number
}
```

## Security Considerations

1. **Authentication Flow**
   - JWT token rotation
   - Store-specific session validation
   - Role-based access control

2. **Data Protection**
   - Store isolation
   - Input validation
   - Rate limiting

3. **Error Handling**
   - Graceful error recovery
   - Detailed logging
   - User-friendly error messages

## Deployment Checklist

- [ ] Environment variables configuration
- [ ] Database indexing
- [ ] Security headers setup
- [ ] Rate limiting configuration
- [ ] Monitoring setup
- [ ] Backup configuration
- [ ] CI/CD pipeline setup

## Performance Optimization

1. **Database Optimization**
   - Proper indexing
   - Query optimization
   - Connection pooling

2. **Frontend Optimization**
   - Code splitting
   - Image optimization
   - Cache strategies

3. **API Optimization**
   - Response compression
   - Cache headers
   - Batch requests

## Monitoring and Maintenance

1. **Performance Monitoring**
   - Response time tracking
   - Error rate monitoring
   - Resource usage tracking

2. **Data Maintenance**
   - Regular backups
   - Data cleanup
   - Index optimization

3. **Security Monitoring**
   - Access logs
   - Auth failure tracking
   - Rate limit monitoring