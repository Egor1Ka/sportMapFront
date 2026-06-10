import { postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface AuthRefreshResponse {
	accessToken: string
}

const authApiConfig = {
	refresh: endpoint<void, AuthRefreshResponse>({
		url: () => `/api/auth/refresh`,
		method: postData,
		defaultErrorMessage: 'Session refresh failed',
	}),

	logout: endpoint<void, null>({
		url: () => `/api/auth/logout`,
		method: postData,
		defaultErrorMessage: 'Logout failed',
	}),
}

export default authApiConfig
export type { AuthRefreshResponse }
