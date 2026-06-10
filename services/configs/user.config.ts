import { getData, putData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface User {
	id: string
	name: string
	email: string
	avatar: string
	isAdmin: boolean
	createdAt: string
	updatedAt: string
}

interface UpdateUserBody {
	name: string
}

interface ApiResponse<T> {
	data: T
	statusCode: number
	status: string
}

const userApiConfig = {
	me: endpoint<void, ApiResponse<User>>({
		url: () => `/api/user/profile`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch profile',
	}),

	update: endpoint<UpdateUserBody, ApiResponse<User>>({
		url: ({ id }) => `/api/user/${id}`,
		method: putData,
		defaultErrorMessage: 'Failed to update profile',
	}),
}

export default userApiConfig
export type { User, UpdateUserBody, ApiResponse }
