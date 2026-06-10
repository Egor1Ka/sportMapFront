import { cn } from '@/lib/utils'

interface PresencePulseProps {
	active: boolean
	className?: string
}

function PresencePulse({ active, className }: PresencePulseProps) {
	return (
		<span
			data-slot="presence-pulse"
			data-active={active || undefined}
			className={cn(
				'relative inline-flex h-3 w-3 items-center justify-center',
				className,
			)}
		>
			<span
				className={cn(
					'absolute inline-flex h-3 w-3 rounded-full',
					active
						? 'bg-emerald-500/60 animate-pulse-presence'
						: 'bg-muted',
				)}
			/>
			<span
				className={cn(
					'relative inline-flex h-2 w-2 rounded-full',
					active ? 'bg-emerald-500' : 'bg-muted-foreground',
				)}
			/>
		</span>
	)
}

export { PresencePulse }
