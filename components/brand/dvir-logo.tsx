import { cn } from '@/lib/utils'

type DvirMarkProps = {
	className?: string
}

type DvirLogoProps = {
	className?: string
	markClassName?: string
	wordmarkClassName?: string
	showWordmark?: boolean
	tagline?: string
}

const MARK_SIZE = 40

function DvirMark({ className }: DvirMarkProps) {
	return (
		<svg
			data-slot="dvir-mark"
			width={MARK_SIZE}
			height={MARK_SIZE}
			viewBox="0 0 40 40"
			fill="none"
			role="img"
			aria-label="Dvir"
			className={cn('text-brand', className)}
		>
			<g transform="translate(1,1)" fill="none">
				<path
					d="M0 0 L14 0 C27 0 38 8 38 19 C38 30 27 38 14 38 L0 38 Z"
					stroke="currentColor"
					strokeWidth={4.5}
					strokeLinejoin="round"
				/>
				<line
					x1="0"
					y1="19"
					x2="34"
					y2="19"
					stroke="currentColor"
					strokeWidth={2.6}
				/>
				<circle
					cx="17"
					cy="19"
					r="7"
					stroke="currentColor"
					strokeWidth={2.6}
				/>
				<circle cx="17" cy="19" r="2.4" className="fill-brand-accent" />
			</g>
		</svg>
	)
}

function DvirLogo({
	className,
	markClassName,
	wordmarkClassName,
	showWordmark = true,
	tagline,
}: DvirLogoProps) {
	return (
		<span
			data-slot="dvir-logo"
			className={cn('inline-flex items-center gap-2.5', className)}
		>
			<DvirMark className={markClassName} />
			{showWordmark ? (
				<span className="flex flex-col leading-none">
					<span
						className={cn(
							'font-display text-2xl font-bold tracking-tight',
							wordmarkClassName,
						)}
					>
						<span className="text-brand dark:text-foreground">D</span>
						<span className="text-foreground">vir</span>
					</span>
					{tagline ? (
						<span className="text-muted-foreground mt-1 text-[11px] font-medium tracking-wide">
							{tagline}
						</span>
					) : null}
				</span>
			) : null}
		</span>
	)
}

export { DvirLogo, DvirMark }
