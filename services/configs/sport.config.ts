import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface Sport {
	id: string
	code: string
	label: string
	icon: string | null
	color: string | null
	order: number
}

interface SportListResponse {
	items: Sport[]
}

interface CreateSportBody {
	code: string
	label: string
	icon?: string
	color?: string
	order?: number
}

const sportApiConfig = {
	list: endpoint<void, SportListResponse>({
		url: () => `/api/sports`,
		method: getData,
		defaultErrorMessage: 'Failed to load sports',
	}),

	create: endpoint<CreateSportBody, Sport>({
		url: () => `/api/sports`,
		method: postData,
		defaultErrorMessage: 'Failed to create sport',
	}),
}

export default sportApiConfig
export type { Sport, SportListResponse, CreateSportBody }
