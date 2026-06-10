'use client'

import { useTranslations } from 'next-intl'
import type { SlotMode } from '@/lib/slot-engine'
import type { EventType } from '@/services/configs/booking.types'
import type { ConfirmedBooking } from '@/lib/calendar/types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2Icon } from 'lucide-react'

const formatLocalTime = (isoString: string): string => {
	const d = new Date(isoString)
	const hh = String(d.getUTCHours()).padStart(2, '0')
	const mm = String(d.getUTCMinutes()).padStart(2, '0')
	return `${hh}:${mm}`
}

function EmptyState({ message }: { message?: string }) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col items-center justify-center py-8 text-center">
			<p className="text-muted-foreground text-sm">
				{message ?? t('selectService')}
			</p>
		</div>
	)
}

function ServiceInfo({
	eventType,
	slotMode,
}: {
	eventType: EventType
	slotMode: SlotMode
}) {
	const t = useTranslations('booking')
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<span className="text-sm font-semibold">{eventType.name}</span>
			</div>
			<div className="text-muted-foreground text-xs">
				{eventType.durationMin} {t('min')} · {eventType.price} {eventType.currency}
			</div>
			<Separator />
			<p className="text-muted-foreground text-xs">
				{t('clickDashedZone')}
			</p>
			<Badge variant="secondary" className="w-fit text-xs">
				{slotMode}
			</Badge>
			<p className="text-muted-foreground text-xs">
				{t(`modeDescriptions.${slotMode}`)}
			</p>
		</div>
	)
}

function ConfirmedState({
	confirmedBooking,
	onCancel,
	confirmLabel,
}: {
	confirmedBooking: ConfirmedBooking
	onCancel: () => void
	confirmLabel?: string
}) {
	const t = useTranslations('booking')
	const startTime = formatLocalTime(confirmedBooking.startAt)
	const endTime = formatLocalTime(confirmedBooking.endAt)

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-green-600">
				<CheckCircle2Icon className="size-5" />
				<span className="text-sm font-semibold">
					{confirmLabel ?? t('bookingConfirmed')}
				</span>
			</div>
			<Separator />
			<div className="flex items-center gap-2">
				<div
					className="size-3 rounded-full"
					style={{ backgroundColor: confirmedBooking.color }}
				/>
				<span className="text-sm font-medium">
					{confirmedBooking.eventTypeName}
				</span>
			</div>
			<div className="grid grid-cols-2 gap-y-2 text-xs">
				<span className="text-muted-foreground">{t('startTime')}</span>
				<span className="font-medium">{startTime}</span>
				<span className="text-muted-foreground">{t('endTime')}</span>
				<span className="font-medium">{endTime}</span>
				<span className="text-muted-foreground">{t('duration')}</span>
				<span className="font-medium">{confirmedBooking.durationMin} {t('min')}</span>
				<span className="text-muted-foreground">{t('price')}</span>
				<span className="font-medium">
					{confirmedBooking.price} {confirmedBooking.currency}
				</span>
				<span className="text-muted-foreground">{t('status')}</span>
				<span className="font-medium">{confirmedBooking.status}</span>
			</div>
			<button
				type="button"
				onClick={onCancel}
				className="text-destructive mt-2 text-xs hover:underline"
			>
				{t('cancel')}
			</button>
		</div>
	)
}

export { EmptyState, ServiceInfo, ConfirmedState, formatLocalTime }
