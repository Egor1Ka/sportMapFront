'use client'

import { useTranslations } from 'next-intl'
import { timeToMin, minToTime } from '@/lib/slot-engine'
import type { SlotMode } from '@/lib/slot-engine'
import type { EventType } from '@/services/configs/booking.types'
import type { ConfirmedBooking } from '@/lib/calendar/types'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { EmptyState, ServiceInfo, ConfirmedState } from './BookingPanelParts'

interface BookingPanelProps {
	selectedEventType: EventType | null
	selectedSlot: string | null
	slotMode: SlotMode
	confirmedBooking: ConfirmedBooking | null
	onConfirm: () => void
	onCancel: () => void
	onResetSlot: () => void
}

function PendingSlot({
	eventType,
	slotTime,
	onConfirm,
	onResetSlot,
}: {
	eventType: EventType
	slotTime: string
	onConfirm: () => void
	onResetSlot: () => void
}) {
	const t = useTranslations('booking')
	const startMin = timeToMin(slotTime)
	const endMin = startMin + eventType.durationMin
	const endTime = minToTime(endMin)

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<span className="text-sm font-semibold">{eventType.name}</span>
			</div>
			<Separator />
			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('startTime')}</span>
				<span className="font-medium">{slotTime}</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">{endTime}</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">{eventType.durationMin} {t('min')}</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{eventType.price} {eventType.currency}
				</span>
			</div>
			<Button onClick={onConfirm} className="mt-2 w-full">
				{t('confirmBooking')}
			</Button>
			<button
				type="button"
				onClick={onResetSlot}
				className="text-primary text-xs hover:underline"
			>
				{t('chooseAnotherTime')}
			</button>
		</div>
	)
}

function BookingPanel({
	selectedEventType,
	selectedSlot,
	slotMode,
	confirmedBooking,
	onConfirm,
	onCancel,
	onResetSlot,
}: BookingPanelProps) {
	if (confirmedBooking) {
		return (
			<ConfirmedState
				confirmedBooking={confirmedBooking}
				onCancel={onCancel}
			/>
		)
	}

	if (!selectedEventType) return <EmptyState />

	if (!selectedSlot) {
		return <ServiceInfo eventType={selectedEventType} slotMode={slotMode} />
	}

	return (
		<PendingSlot
			eventType={selectedEventType}
			slotTime={selectedSlot}
			onConfirm={onConfirm}
			onResetSlot={onResetSlot}
		/>
	)
}

export { BookingPanel }
