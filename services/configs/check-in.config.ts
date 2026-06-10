import { postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { CheckInResponse } from './check-in.types'

const checkInApiConfig = {
	checkIn: endpoint<void, CheckInResponse>({
		url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/check-in`,
		method: postData,
		defaultErrorMessage: 'Failed to check in',
	}),

	checkOut: endpoint<void, CheckInResponse>({
		url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/check-in`,
		method: deleteData,
		defaultErrorMessage: 'Failed to check out',
	}),
}

export default checkInApiConfig
