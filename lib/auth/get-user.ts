import 'server-only'

import { cookies } from 'next/headers'
import type { User, ApiResponse } from '@/services/configs/user.config'

export async function getUser(): Promise<User | null> {
	const cookieStore = await cookies()
	const accessToken = cookieStore.get('accessToken')?.value

	if (!accessToken) return null

	const backendUrl = process.env.BACKEND_URL ?? ''

	try {
		const response = await fetch(`${backendUrl}/api/user/profile`, {
			headers: { Cookie: `accessToken=${accessToken}` },
			cache: 'no-store',
		})

		if (!response.ok) return null

		const json: ApiResponse<User> = await response.json()
		return json.data
	} catch {
		return null
	}
}
