'use client'

import { type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { timeToMin } from '@/lib/slot-engine'
import type { EventType } from '@/services/configs/booking.types'

interface SlotServicePopoverProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	anchor: ReactNode
	slotTime: string
	workEnd: string
	services: EventType[]
	onPick: (eventTypeId: string) => void
}

const minutesBetween = (from: string, to: string): number =>
	timeToMin(to) - timeToMin(from)

const buildFitList = (
	services: EventType[],
	slotTime: string,
	workEnd: string,
): EventType[] => {
	const windowMin = minutesBetween(slotTime, workEnd)
	const fits = (service: EventType): boolean =>
		service.durationMin <= windowMin
	return services.filter(fits)
}

function SlotServicePopover({
	open,
	onOpenChange,
	anchor,
	slotTime,
	workEnd,
	services,
	onPick,
}: SlotServicePopoverProps) {
	const t = useTranslations('booking')
	const visible = buildFitList(services, slotTime, workEnd)

	const renderService = (service: EventType) => {
		const handleClick = () => {
			onPick(service.id)
			onOpenChange(false)
		}
		return (
			<button
				key={service.id}
				type="button"
				onClick={handleClick}
				className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
			>
				<span
					className="size-2.5 rounded-full"
					style={{ backgroundColor: service.color }}
				/>
				<span className="flex-1 font-medium">{service.name}</span>
				<span className="text-muted-foreground text-xs">
					{service.durationMin} {t('min')}
				</span>
			</button>
		)
	}

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger render={<>{anchor}</>} />
			<PopoverContent className="w-64 p-2" align="start">
				<div className="text-muted-foreground px-2 pb-1 text-xs font-semibold">
					{t('pickServiceTitle')}
				</div>
				{visible.length === 0 ? (
					<div className="text-muted-foreground px-2 py-1 text-xs">
						{t('noServicesForSlot')}
					</div>
				) : (
					<div className="flex flex-col">{visible.map(renderService)}</div>
				)}
			</PopoverContent>
		</Popover>
	)
}

export { SlotServicePopover }
