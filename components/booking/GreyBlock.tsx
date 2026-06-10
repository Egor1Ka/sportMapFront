'use client'

import { minutesToPx, durationToPx } from '@/lib/calendar/utils'
import type { CalendarBlock } from '@/lib/calendar/types'

interface GreyBlockProps {
	block: CalendarBlock
}

function GreyBlock({ block }: GreyBlockProps) {
	return (
		<div
			className="bg-muted absolute right-0 left-12 cursor-default rounded-md pointer-events-none"
			style={{
				top: minutesToPx(block.startMin),
				height: durationToPx(block.duration),
				opacity: 0.6,
			}}
		/>
	)
}

export { GreyBlock }
