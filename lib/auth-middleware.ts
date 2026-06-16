import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSafeRedirectPath } from '@/lib/utils'

const protectedPaths = ['/dashboard', '/billing']
const authPaths = ['/login', '/signup']

const ACCESS_COOKIE = 'accessToken'
const REFRESH_COOKIE = 'refreshToken'
const ACCESS_MAX_AGE_SECONDS = 900

type AuthState = {
	authed: boolean
	newAccessToken: string | null
	clearCookies: boolean
}

const isProtectedPath = (pathname: string): boolean =>
	protectedPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	)

const isAuthPath = (pathname: string): boolean =>
	authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

const decodeBase64Url = (value: string): string => {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
	const padding = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : ''
	return atob(base64 + padding)
}

const readJwtExpiry = (token: string): number | null => {
	const payload = token.split('.')[1]
	if (!payload) return null
	try {
		const parsed = JSON.parse(decodeBase64Url(payload))
		return typeof parsed.exp === 'number' ? parsed.exp : null
	} catch {
		return null
	}
}

const isTokenExpired = (token: string): boolean => {
	const expiry = readJwtExpiry(token)
	if (!expiry) return true
	const nowSeconds = Date.now() / 1000
	return nowSeconds >= expiry - 30
}

const extractAccessToken = (setCookieHeader: string): string | null => {
	const match = setCookieHeader.match(/accessToken=([^;]+)/)
	return match ? match[1] : null
}

const requestNewAccessToken = async (
	refreshToken: string,
): Promise<string | null> => {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const response = await fetch(`${backendUrl}/api/auth/refresh`, {
			method: 'POST',
			headers: { Cookie: `${REFRESH_COOKIE}=${refreshToken}` },
			cache: 'no-store',
		})
		if (!response.ok) return null
		const setCookieHeader = response.headers.get('set-cookie')
		if (!setCookieHeader) return null
		return extractAccessToken(setCookieHeader)
	} catch {
		return null
	}
}

export async function evaluateAuth(request: NextRequest): Promise<AuthState> {
	const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
	const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

	if (accessToken && !isTokenExpired(accessToken)) {
		return { authed: true, newAccessToken: null, clearCookies: false }
	}

	if (refreshToken) {
		const refreshed = await requestNewAccessToken(refreshToken)
		if (refreshed) {
			return { authed: true, newAccessToken: refreshed, clearCookies: false }
		}
		return { authed: false, newAccessToken: null, clearCookies: true }
	}

	return { authed: false, newAccessToken: null, clearCookies: !!accessToken }
}

const resolveCallbackUrl = (request: NextRequest): string => {
	const rawCallbackUrl = request.cookies.get('callbackUrl')?.value
	if (!rawCallbackUrl) return '/dashboard'
	const decoded = decodeURIComponent(rawCallbackUrl)
	return isSafeRedirectPath(decoded) ? decoded : '/dashboard'
}

export function buildAuthRedirect(
	request: NextRequest,
	auth: AuthState,
): NextResponse | null {
	const { pathname } = request.nextUrl

	if (isProtectedPath(pathname) && !auth.authed) {
		const loginUrl = new URL('/login', request.url)
		loginUrl.searchParams.set(
			'callbackUrl',
			pathname + request.nextUrl.search,
		)
		const response = NextResponse.redirect(loginUrl)
		response.cookies.delete('callbackUrl')
		response.cookies.set('callbackUrl', pathname + request.nextUrl.search, {
			path: '/',
		})
		return response
	}

	if (isAuthPath(pathname) && auth.authed) {
		const response = NextResponse.redirect(
			new URL(resolveCallbackUrl(request), request.url),
		)
		response.cookies.delete('callbackUrl')
		return response
	}

	if (pathname === '/' && auth.authed && request.cookies.has('callbackUrl')) {
		const response = NextResponse.redirect(
			new URL(resolveCallbackUrl(request), request.url),
		)
		response.cookies.delete('callbackUrl')
		return response
	}

	return null
}

export function applyAuthCookies(
	response: NextResponse,
	request: NextRequest,
	auth: AuthState,
): NextResponse {
	const secure = request.nextUrl.protocol === 'https:'

	if (auth.newAccessToken) {
		response.cookies.set(ACCESS_COOKIE, auth.newAccessToken, {
			httpOnly: true,
			secure,
			sameSite: 'lax',
			path: '/',
			maxAge: ACCESS_MAX_AGE_SECONDS,
		})
		return response
	}

	if (auth.clearCookies) {
		response.cookies.delete(ACCESS_COOKIE)
		response.cookies.delete(REFRESH_COOKIE)
	}

	return response
}
