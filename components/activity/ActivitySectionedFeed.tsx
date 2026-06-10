'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ActivityFeedItem } from './ActivityFeedItem'
import type { FeedItem } from './activity-types'
import { cn } from '@/lib/utils'

const SECTION_LIMIT = 20

type TabId = 'events' | 'playgrounds'

const isSoon = (item: FeedItem): boolean => item.type === 'soon'
const isPlayground = (item: FeedItem): boolean => item.type !== 'soon'

const buildItemKey = (item: FeedItem): string => {
	if (item.type === 'soon') return `soon-${item.playground.id}-${item.event.id}`
	return `${item.type}-${item.playground.id}`
}

const renderItem = (item: FeedItem) => (
	<ActivityFeedItem key={buildItemKey(item)} item={item} />
)

interface TabCardProps {
	emoji: string
	title: string
	subtitle: string
	count: number
	isActive: boolean
	onClick: () => void
}

const TabCard = ({
	emoji,
	title,
	subtitle,
	count,
	isActive,
	onClick,
}: TabCardProps) => (
	<button
		type="button"
		onClick={onClick}
		aria-pressed={isActive}
		className={cn(
			'group relative flex flex-col gap-1 rounded-xl border p-4 text-left transition-all',
			isActive
				? 'border-primary bg-primary/5 ring-primary/20 shadow-sm ring-2'
				: 'border-border bg-card hover:bg-accent/30',
		)}
	>
		<div className="flex items-start justify-between gap-2">
			<span className="text-3xl leading-none">{emoji}</span>
			<span
				className={cn(
					'rounded-full px-2 py-0.5 text-xs font-bold',
					isActive
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground',
				)}
			>
				{count}
			</span>
		</div>
		<span
			className={cn(
				'text-base font-semibold sm:text-lg',
				isActive ? 'text-foreground' : 'text-foreground/90',
			)}
		>
			{title}
		</span>
		<span className="text-muted-foreground text-xs">{subtitle}</span>
	</button>
)

interface ListProps {
	items: FeedItem[]
	emptyText: string
}

const FeedList = ({ items, emptyText }: ListProps) => {
	if (items.length === 0) {
		return (
			<p className="text-muted-foreground py-12 text-center text-sm">
				{emptyText}
			</p>
		)
	}
	return (
		<div className="flex flex-col gap-2">
			{items.slice(0, SECTION_LIMIT).map(renderItem)}
		</div>
	)
}

const ActivitySectionedFeed = ({ items }: { items: FeedItem[] }) => {
	const tSections = useTranslations('activity.sections')
	const tFeed = useTranslations('activity.feed')
	const [activeTab, setActiveTab] = useState<TabId>('events')

	const handleSelectEvents = useCallback(() => setActiveTab('events'), [])
	const handleSelectPlaygrounds = useCallback(
		() => setActiveTab('playgrounds'),
		[],
	)

	if (items.length === 0) {
		return (
			<div className="text-muted-foreground p-8 text-center text-sm">
				{tFeed('empty')}
			</div>
		)
	}

	const events = items.filter(isSoon)
	const playgrounds = items.filter(isPlayground)

	const activeItems = activeTab === 'events' ? events : playgrounds
	const activeEmptyText =
		activeTab === 'events'
			? tSections('eventsEmpty')
			: tSections('playgroundsEmpty')

	return (
		<div className="px-4 pt-4">
			<div className="grid grid-cols-2 gap-3">
				<TabCard
					emoji="📅"
					title={tSections('events')}
					subtitle={tSections('eventsTagline')}
					count={events.length}
					isActive={activeTab === 'events'}
					onClick={handleSelectEvents}
				/>
				<TabCard
					emoji="🏟️"
					title={tSections('playgrounds')}
					subtitle={tSections('playgroundsTagline')}
					count={playgrounds.length}
					isActive={activeTab === 'playgrounds'}
					onClick={handleSelectPlaygrounds}
				/>
			</div>
			<div className="mt-4">
				<FeedList items={activeItems} emptyText={activeEmptyText} />
			</div>
		</div>
	)
}

export { ActivitySectionedFeed }
