import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ActivityFeedItem } from './ActivityFeedItem'
import type { FeedItemLive } from './activity-types'
import type { ReactNode } from 'react'

const messages = {
	activity: {
		feed: {
			live: {
				badge: 'LIVE',
				title: '{count} людей грають',
				distanceMeters: '{meters} м',
				distanceKm: '{km} км',
			},
			soon: { badge: 'СКОРО', title: '{sport} за {minutes} хв' },
			top: { badge: 'ТОП' },
		},
	},
}

const renderWithIntl = (ui: ReactNode) =>
	render(
		<NextIntlClientProvider locale="uk" messages={messages}>
			{ui}
		</NextIntlClientProvider>,
	)

const makeLiveItem = (overrides: Partial<FeedItemLive> = {}): FeedItemLive => ({
	type: 'live',
	playground: {
		id: 'p1',
		name: 'Парк Шевченка',
		description: null,
		lat: 50.4501,
		lng: 30.5234,
		address: { city: 'Київ', district: null, street: null, fullAddress: null },
		sports: [
			{ id: 's1', code: 'football', label: 'Футбол', icon: null, color: null },
		],
		photos: [],
		counters: { activeCheckIns: 12, upcomingEvents: 0 },
		rating: { average: 4.5, count: 8 },
		createdBy: null,
		createdAt: null,
		updatedAt: null,
	},
	activeCount: 12,
	distanceMeters: 500,
	...overrides,
})

describe('ActivityFeedItem live', () => {
	it('renders count and LIVE badge', () => {
		renderWithIntl(<ActivityFeedItem item={makeLiveItem()} />)
		expect(screen.getByText(/12 людей грають/)).toBeInTheDocument()
		expect(screen.getByText('LIVE')).toBeInTheDocument()
		expect(screen.getByText(/Парк Шевченка/)).toBeInTheDocument()
	})

	it('renders distance in meters when under 1km', () => {
		renderWithIntl(
			<ActivityFeedItem item={makeLiveItem({ distanceMeters: 500 })} />,
		)
		expect(screen.getByText(/500 м/)).toBeInTheDocument()
	})

	it('renders distance in km when >= 1km', () => {
		renderWithIntl(
			<ActivityFeedItem item={makeLiveItem({ distanceMeters: 2300 })} />,
		)
		expect(screen.getByText(/2.3 км/)).toBeInTheDocument()
	})
})
