import type { Playground, PlaygroundEvent } from '@/services'

interface FeedItemLive {
	type: 'live'
	playground: Playground
	activeCount: number
	distanceMeters: number | null
}

interface FeedItemSoon {
	type: 'soon'
	playground: Playground
	event: PlaygroundEvent
	startsInMin: number
	distanceMeters: number | null
}

interface FeedItemTop {
	type: 'top'
	playground: Playground
	dailyCount: number
	distanceMeters: number | null
}

type FeedItem = FeedItemLive | FeedItemSoon | FeedItemTop

export type { FeedItem, FeedItemLive, FeedItemSoon, FeedItemTop }
