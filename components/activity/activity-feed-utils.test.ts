import { describe, it, expect } from 'vitest'
import {
	distanceMeters,
	playgroundsToFeedItems,
	sortFeedItems,
	filterBySport,
} from './activity-feed-utils'
import type { Playground } from '@/services'

const makePlayground = (overrides: Partial<Playground> = {}): Playground => ({
	id: 'p1',
	name: 'Test',
	description: null,
	lat: 50.4501,
	lng: 30.5234,
	address: { city: null, district: null, street: null, fullAddress: null },
	sports: [],
	photos: [],
	counters: { activeCheckIns: 0, upcomingEvents: 0 },
	rating: { average: null, count: 0 },
	createdBy: null,
	createdAt: null,
	updatedAt: null,
	...overrides,
})

describe('distanceMeters', () => {
	it('returns 0 for identical points', () => {
		expect(distanceMeters(50, 30, 50, 30)).toBe(0)
	})

	it('returns ~111 km for 1 degree latitude difference', () => {
		const meters = distanceMeters(50, 30, 51, 30)
		expect(meters).toBeGreaterThan(110_000)
		expect(meters).toBeLessThan(112_000)
	})
})

describe('playgroundsToFeedItems', () => {
	it('emits live item for playgrounds with activeCheckIns > 0', () => {
		const playground = makePlayground({ counters: { activeCheckIns: 5, upcomingEvents: 0 } })
		const items = playgroundsToFeedItems([playground], { lat: 50.4501, lng: 30.5234 })
		expect(items).toHaveLength(1)
		expect(items[0].type).toBe('live')
		if (items[0].type === 'live') expect(items[0].activeCount).toBe(5)
	})

	it('emits top item for playgrounds with no live but with rating', () => {
		const playground = makePlayground({
			counters: { activeCheckIns: 0, upcomingEvents: 0 },
			rating: { average: 4.5, count: 10 },
		})
		const items = playgroundsToFeedItems([playground], { lat: 50.4501, lng: 30.5234 })
		expect(items).toHaveLength(1)
		expect(items[0].type).toBe('top')
	})

	it('skips playgrounds with no activity and no rating', () => {
		const playground = makePlayground()
		const items = playgroundsToFeedItems([playground], { lat: 50.4501, lng: 30.5234 })
		expect(items).toHaveLength(0)
	})
})

describe('sortFeedItems', () => {
	const userPos = { lat: 50.4501, lng: 30.5234 }

	it('puts live items before top items', () => {
		const top = makePlayground({
			id: 'top',
			counters: { activeCheckIns: 0, upcomingEvents: 0 },
			rating: { average: 4.9, count: 100 },
		})
		const live = makePlayground({
			id: 'live',
			counters: { activeCheckIns: 1, upcomingEvents: 0 },
		})
		const items = playgroundsToFeedItems([top, live], userPos)
		const sorted = sortFeedItems(items)
		expect(sorted[0].playground.id).toBe('live')
	})

	it('within live items, more active count ranks higher', () => {
		const small = makePlayground({
			id: 'small',
			counters: { activeCheckIns: 1, upcomingEvents: 0 },
			lat: 50.4501,
			lng: 30.5234,
		})
		const big = makePlayground({
			id: 'big',
			counters: { activeCheckIns: 12, upcomingEvents: 0 },
			lat: 50.4501,
			lng: 30.5234,
		})
		const items = playgroundsToFeedItems([small, big], userPos)
		const sorted = sortFeedItems(items)
		expect(sorted[0].playground.id).toBe('big')
	})
})

describe('filterBySport', () => {
	it('keeps live item when playground has selected sport', () => {
		const playground = makePlayground({
			counters: { activeCheckIns: 3, upcomingEvents: 0 },
			sports: [{ id: 's', code: 'football', label: 'Football', icon: null, color: null }],
		})
		const items = playgroundsToFeedItems([playground], { lat: 50, lng: 30 })
		expect(filterBySport(items, 'football')).toHaveLength(1)
		expect(filterBySport(items, 'basketball')).toHaveLength(0)
	})

	it('keeps everything when no sport filter', () => {
		const playground = makePlayground({ counters: { activeCheckIns: 1, upcomingEvents: 0 } })
		const items = playgroundsToFeedItems([playground], { lat: 50, lng: 30 })
		expect(filterBySport(items, null)).toHaveLength(1)
	})
})
