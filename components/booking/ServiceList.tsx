'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { EventType } from '@/services/configs/booking.types'

interface ServiceListProps {
	eventTypes: EventType[]
	selectedId: string | null
	onSelect: (eventTypeId: string) => void
	staffId?: string | null
	eventTypesByStaff?: Map<string, EventType[]>
}

const buildVisibleList = (
	eventTypes: EventType[],
	staffId: string | null | undefined,
	eventTypesByStaff: Map<string, EventType[]> | undefined,
): EventType[] => {
	if (!staffId) return eventTypes
	if (!eventTypesByStaff) return eventTypes
	const forStaff = eventTypesByStaff.get(staffId)
	if (!forStaff) return []
	return forStaff
}

function ServiceList({ eventTypes, selectedId, onSelect, staffId = null, eventTypesByStaff }: ServiceListProps) {
	const t = useTranslations('booking')
	const visible = buildVisibleList(eventTypes, staffId, eventTypesByStaff)

	const renderEventType = (eventType: EventType) => {
		const isActive = eventType.id === selectedId
		const handleClick = () => onSelect(eventType.id)

		return (
			<button
				key={eventType.id}
				type="button"
				onClick={handleClick}
				className={cn(
					'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
					isActive
						? 'border-primary bg-primary/5'
						: 'border-border hover:bg-muted',
				)}
			>
				<div
					className="size-3 shrink-0 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<div className="flex-1">
					<div className="text-sm font-medium">{eventType.name}</div>
					<div className="text-muted-foreground text-xs">
						{eventType.durationMin} {t('min')} · {eventType.price} {eventType.currency}
					</div>
				</div>
			</button>
		)
	}

	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-muted-foreground text-sm font-medium">{t('services')}</h3>
			{visible.map(renderEventType)}
		</div>
	)
}

export { ServiceList }
