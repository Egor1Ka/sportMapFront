import { isSafeRedirectPath } from '@/lib/utils'

const HOME_PATH = '/'
const HOME_REDIRECT_PATH = '/sports-map'
const AUTH_PATHS = ['/login', '/signup']
const CALLBACK_COOKIE_NAME = 'callbackUrl'
const CALLBACK_COOKIE_MAX_AGE = 600

const isAuthPath = (path: string): boolean =>
	AUTH_PATHS.some(
		(authPath) => path === authPath || path.startsWith(`${authPath}/`),
	)

const parseSameOriginUrl = (rawUrl: string, origin: string): URL | null => {
	try {
		const parsed = new URL(rawUrl)
		if (parsed.origin !== origin) return null
		return parsed
	} catch {
		return null
	}
}

const getReferrerPath = (referrer: string, origin: string): string | null => {
	if (!referrer) return null
	const url = parseSameOriginUrl(referrer, origin)
	if (!url) return null
	return url.pathname + url.search
}

const remapHomeToSportsMap = (path: string): string =>
	path === HOME_PATH ? HOME_REDIRECT_PATH : path

const getCallbackFromUrlParams = (search: string): string | null => {
	const params = new URLSearchParams(search)
	const fromParam = params.get('callbackUrl') || params.get('returnTo')
	if (!fromParam) return null
	if (!isSafeRedirectPath(fromParam)) return null
	return remapHomeToSportsMap(fromParam)
}

const getCallbackFromReferrer = (
	referrer: string,
	origin: string,
): string | null => {
	const path = getReferrerPath(referrer, origin)
	if (!path) return null
	if (isAuthPath(path)) return null
	const remapped = remapHomeToSportsMap(path)
	if (!isSafeRedirectPath(remapped)) return null
	return remapped
}

export const resolvePostLoginCallbackPath = (): string | null => {
	if (typeof window === 'undefined') return null
	const fromParams = getCallbackFromUrlParams(window.location.search)
	if (fromParams) return fromParams
	return getCallbackFromReferrer(document.referrer, window.location.origin)
}

export const setCallbackCookie = (path: string): void => {
	document.cookie = `${CALLBACK_COOKIE_NAME}=${encodeURIComponent(path)};path=/;max-age=${CALLBACK_COOKIE_MAX_AGE};samesite=lax`
}
