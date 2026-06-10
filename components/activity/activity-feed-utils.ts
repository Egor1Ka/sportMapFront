import type { Playground } from '@/services'
import type { FeedItem, FeedItemLive, FeedItemSoon, FeedItemTop } from './activity-types'

const EARTH_RADIUS_M = 6_371_000

const toRad = (deg: number): number => (deg * Math.PI) / 180

const distanceMeters = (
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number => {
	const dLat = toRad(lat2 - lat1)
	const dLng = toRad(lng2 - lng1)
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

const computeDistance = (
	playground: Playground,
	user: { lat: number; lng: number },
): number | null => {
	if (typeof playground.lat !== 'number' || typeof playground.lng !== 'number') return null
	return distanceMeters(user.lat, user.lng, playground.lat, playground.lng)
}

const toLiveItem = (
	playground: Playground,
	user: { lat: number; lng: number },
): FeedItem => ({
	type: 'live',
	playground,
	activeCount: playground.counters.activeCheckIns,
	distanceMeters: computeDistance(playground, user),
})

const toTopItem = (
	playground: Playground,
	user: { lat: number; lng: number },
): FeedItem => ({
	type: 'top',
	playground,
	dailyCount: playground.counters.activeCheckIns,
	distanceMeters: computeDistance(playground, user),
})

const hasRating = (playground: Playground): boolean =>
	playground.rating.average !== null && playground.rating.count > 0

const toFeedItem =
	(user: { lat: number; lng: number }) =>
	(playground: Playground): FeedItem | null => {
		if (playground.counters.activeCheckIns > 0) return toLiveItem(playground, user)
		if (hasRating(playground)) return toTopItem(playground, user)
		return null
	}

const isNotNull = <T>(value: T | null): value is T => value !== null

const playgroundsToFeedItems = (
	playgrounds: Playground[],
	user: { lat: number; lng: number },
): FeedItem[] => playgrounds.map(toFeedItem(user)).filter(isNotNull)

const SCORE_LIVE = 1_000_000
const SCORE_SOON = 500_000
const SCORE_TOP_PER_DAILY = 100
const SCORE_LIVE_PER_ACTIVE = 1000
const DEFAULT_DISTANCE = 5000
const PROXIMITY_RANGE = 5000
const PROXIMITY_DIVISOR = 10

const scoreLive = (item: FeedItemLive): number =>
	SCORE_LIVE + item.activeCount * SCORE_LIVE_PER_ACTIVE

const scoreSoon = (item: FeedItemSoon): number => SCORE_SOON - item.startsInMin

const scoreTop = (item: FeedItemTop): number => item.dailyCount * SCORE_TOP_PER_DAILY

const kindScore = (item: FeedItem): number => {
	if (item.type === 'live') return scoreLive(item)
	if (item.type === 'soon') return scoreSoon(item)
	return scoreTop(item)
}

const proximityScore = (distance: number | null): number => {
	const effective = distance ?? DEFAULT_DISTANCE
	return Math.max(0, PROXIMITY_RANGE - effective) / PROXIMITY_DIVISOR
}

const scoreItem = (item: FeedItem): number =>
	kindScore(item) + proximityScore(item.distanceMeters)

const byScoreDesc = (a: FeedItem, b: FeedItem): number => scoreItem(b) - scoreItem(a)

const sortFeedItems = (items: FeedItem[]): FeedItem[] => [...items].sort(byScoreDesc)

const sportCodeMatches =
	(sportCode: string) =>
	(sport: { code: string }): boolean =>
		sport.code === sportCode

const playgroundHasSport = (playground: Playground, sportCode: string): boolean =>
	playground.sports.some(sportCodeMatches(sportCode))

const matchesSport =
	(sportCode: string) =>
	(item: FeedItem): boolean => {
		if (item.type === 'soon') return item.event.sport.code === sportCode
		return playgroundHasSport(item.playground, sportCode)
	}

const filterBySport = (items: FeedItem[], sportCode: string | null): FeedItem[] => {
	if (!sportCode) return items
	return items.filter(matchesSport(sportCode))
}

export { distanceMeters, playgroundsToFeedItems, sortFeedItems, filterBySport }
