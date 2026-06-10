import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { authMiddleware } from './lib/auth-middleware'

const handleI18nRouting = createMiddleware(routing)

export async function proxy(request: NextRequest) {
	const authResponse = authMiddleware(request)
	if (authResponse) return authResponse

	return handleI18nRouting(request)
}

export const config = {
	matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
