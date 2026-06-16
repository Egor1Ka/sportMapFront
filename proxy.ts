import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import {
	applyAuthCookies,
	buildAuthRedirect,
	evaluateAuth,
} from './lib/auth-middleware'

const handleI18nRouting = createMiddleware(routing)

export async function proxy(request: NextRequest) {
	const auth = await evaluateAuth(request)

	const redirect = buildAuthRedirect(request, auth)
	if (redirect) return applyAuthCookies(redirect, request, auth)

	const response = handleI18nRouting(request)
	return applyAuthCookies(response, request, auth)
}

export const config = {
	matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
