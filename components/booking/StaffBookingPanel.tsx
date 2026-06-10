'use client'

import { useTranslations } from 'next-intl'
import { timeToMin, minToTime } from '@/lib/slot-engine'
import type { SlotMode } from '@/lib/slot-engine'
import type { EventType } from '@/services/configs/booking.types'
import type { ConfirmedBooking } from '@/lib/calendar/types'
import { Separator } from '@/components/ui/separator'
import { EmptyState, ServiceInfo, ConfirmedState } from './BookingPanelParts'
import { ClientInfoForm, type ClientInfoData } from './ClientInfoForm'

interface StaffBookingPanelProps {
	selectedEventType: EventType | null
	selectedSlot: string | null
	slotMode: SlotMode
	confirmedBooking: ConfirmedBooking | null
	onConfirmWithClient: (data: ClientInfoData) => void
	onCancel: () => void
	onResetSlot: () => void
	isSubmitting: boolean
}

function PendingSlotWithClientForm({
	eventType,
	slotTime,
	onConfirmWithClient,
	onResetSlot,
	isSubmitting,
}: {
	eventType: EventType
	slotTime: string
	onConfirmWithClient: (data: ClientInfoData) => void
	onResetSlot: () => void
	isSubmitting: boolean
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
			<Separator />
			<ClientInfoForm
				onSubmit={onConfirmWithClient}
				isSubmitting={isSubmitting}
			/>
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

function StaffBookingPanel({
	selectedEventType,
	selectedSlot,
	slotMode,
	confirmedBooking,
	onConfirmWithClient,
	onCancel,
	onResetSlot,
	isSubmitting,
}: StaffBookingPanelProps) {
	const t = useTranslations('booking')

	if (confirmedBooking) {
		return (
			<ConfirmedState
				confirmedBooking={confirmedBooking}
				onCancel={onCancel}
				confirmLabel={t('bookingCreated')}
			/>
		)
	}

	if (!selectedEventType) {
		return <EmptyState message={t('selectServiceAndTime')} />
	}

	if (!selectedSlot) {
		return <ServiceInfo eventType={selectedEventType} slotMode={slotMode} />
	}

	return (
		<PendingSlotWithClientForm
			eventType={selectedEventType}
			slotTime={selectedSlot}
			onConfirmWithClient={onConfirmWithClient}
			onResetSlot={onResetSlot}
			isSubmitting={isSubmitting}
		/>
	)
}

export { StaffBookingPanel }
