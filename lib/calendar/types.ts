import type { ReactNode } from 'react'
import type { BookingStatus, Invitee } from '@/services/configs/booking.types'

type ViewMode = 'day' | 'week' | 'month'

type BlockType = 'booking' | 'dropzone' | 'pending' | 'locked' | 'workHours'

interface CalendarBlock {
	id: string
	startMin: number
	duration: number
	date: string
	color: string
	opacity?: number
	borderStyle?: 'solid' | 'dashed'
	label?: string
	sublabel?: string
	onClick?: () => void
	draggable?: boolean
	blockType: BlockType
}

interface ConfirmedBooking {
	bookingId: string
	eventTypeId: string
	eventTypeName: string
	startAt: string
	endAt: string
	timezone: string
	locationId: string | null
	cancelToken: string
	status: BookingStatus
	color: string
	durationMin: number
	price: number
	currency: string
	invitee: Invitee
}

interface CalendarStrategy {
	getBlocks(date: string): CalendarBlock[]
	renderSidebar(): ReactNode
	renderPanel(): ReactNode
	onCellClick(date: string, startMin: number): void
	allowRangeSelect: boolean
	getTitle(date: string, view: ViewMode): string
}

export type {
	ViewMode,
	BlockType,
	CalendarBlock,
	ConfirmedBooking,
	CalendarStrategy,
}
