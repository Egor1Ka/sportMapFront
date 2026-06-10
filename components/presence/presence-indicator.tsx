import { cn } from '@/lib/utils'
import { PresencePulse } from './presence-pulse'

interface PresenceIndicatorProps {
	count: number
	className?: string
}

function PresenceIndicator({ count, className }: PresenceIndicatorProps) {
	return (
		<span
			data-slot="presence-indicator"
			className={cn(
				'inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400',
				className,
			)}
		>
			<PresencePulse active={count > 0} />
			{count}
		</span>
	)
}

export { PresenceIndicator }
