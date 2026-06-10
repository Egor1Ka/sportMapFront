'use client'

import { useRelativeTime } from '@/hooks/use-relative-time'
import { cn } from '@/lib/utils'

interface EventTimeDisplayProps {
	startAt: string
	durationMin: number
	className?: string
}

function EventTimeDisplay({
	startAt,
	durationMin,
	className,
}: EventTimeDisplayProps) {
	const { phase, label } = useRelativeTime({ startAt, durationMin })

	return (
		<span
			data-slot="event-time-display"
			data-phase={phase}
			className={cn('text-sm text-muted-foreground', className)}
		>
			{label}
		</span>
	)
}

export { EventTimeDisplay }
