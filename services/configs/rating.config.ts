import { getData, putData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface RatingUser {
	id: string | null
	name: string | null
}

interface Rating {
	id: string
	targetType: 'playground'
	targetId: string
	user: RatingUser
	value: number
	createdAt: string | null
	updatedAt: string | null
}

interface RatingAggregate {
	average: number | null
	count: number
}

interface UpsertRatingBody {
	targetType: 'playground'
	targetId: string
	value: number
}

const ratingApiConfig = {
	getAggregate: endpoint<void, RatingAggregate>({
		url: () => `/api/ratings/aggregate`,
		method: getData,
		defaultErrorMessage: 'Failed to load rating',
	}),
	upsert: endpoint<UpsertRatingBody, Rating>({
		url: () => `/api/ratings`,
		method: putData,
		defaultErrorMessage: 'Failed to submit rating',
	}),
}

export default ratingApiConfig
export type { Rating, RatingUser, RatingAggregate, UpsertRatingBody }
