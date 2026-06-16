import 'server-only'

import { cookies } from 'next/headers'
import type { User, ApiResponse } from '@/services/configs/user.config'

const ACCESS_COOKIE = 'accessToken'
const REFRESH_COOKIE = 'refreshToken'

const getBackendUrl = (): string => process.env.BACKEND_URL ?? ''

const fetchProfile = async (accessToken: string): Promise<User | null> => {
	try {
		const response = await fetch(`${getBackendUrl()}/api/user/profile`, {
			headers: { Cookie: `${ACCESS_COOKIE}=${accessToken}` },
			cache: 'no-store',
		})
		if (!response.ok) return null
		const json: ApiResponse<User> = await response.json()
		return json.data
	} catch {
		return null
	}
}

const extractAccessToken = (setCookieHeader: string): string | null => {
	const match = setCookieHeader.match(/accessToken=([^;]+)/)
	return match ? match[1] : null
}

const refreshAccessToken = async (
	refreshToken: string,
): Promise<string | null> => {
	try {
		const response = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
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

export async function getUser(): Promise<User | null> {
	const cookieStore = await cookies()
	const accessToken = cookieStore.get(ACCESS_COOKIE)?.value
	const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value

	if (accessToken) {
		const user = await fetchProfile(accessToken)
		if (user) return user
	}

	if (refreshToken) {
		const refreshed = await refreshAccessToken(refreshToken)
		if (refreshed) return fetchProfile(refreshed)
	}

	return null
}
