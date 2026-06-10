import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSafeRedirectPath } from '@/lib/utils'

const protectedPaths = ['/dashboard', '/billing']
const authPaths = ['/login', '/signup']

const isProtectedPath = (pathname: string): boolean =>
	protectedPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	)

const isAuthPath = (pathname: string): boolean =>
	authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

function consumeCallbackUrl(request: NextRequest): NextResponse {
	const rawCallbackUrl = request.cookies.get('callbackUrl')?.value
	const callbackUrl =
		rawCallbackUrl && isSafeRedirectPath(decodeURIComponent(rawCallbackUrl))
			? decodeURIComponent(rawCallbackUrl)
			: '/dashboard'
	const redirectUrl = new URL(callbackUrl, request.url)
	const response = NextResponse.redirect(redirectUrl)
	response.cookies.delete('callbackUrl')
	return response
}

export function authMiddleware(request: NextRequest): NextResponse | null {
	const { pathname } = request.nextUrl
	const accessToken = request.cookies.get('accessToken')?.value

	if (isProtectedPath(pathname) && !accessToken) {
		const loginUrl = new URL('/login', request.url)
		const returnPath = pathname + request.nextUrl.search
		loginUrl.searchParams.set('callbackUrl', returnPath)
		return NextResponse.redirect(loginUrl)
	}

	if (isAuthPath(pathname) && accessToken) {
		return consumeCallbackUrl(request)
	}

	if (pathname === '/' && accessToken && request.cookies.has('callbackUrl')) {
		return consumeCallbackUrl(request)
	}

	return null
}
