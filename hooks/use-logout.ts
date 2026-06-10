'use client'

import { useRouter } from 'next/navigation'
import { authApi } from '@/services'

export function useLogout() {
	const router = useRouter()

	const logout = async () => {
		await authApi.logout({ silent: true })
		router.push('/login')
	}

	return logout
}
