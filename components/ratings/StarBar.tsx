'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type StarBarSize = 'sm' | 'md' | 'lg'

type StarBarProps = {
	value: number | null
	max?: number
	size?: StarBarSize
	interactive?: boolean
	disabled?: boolean
	onChange?: (value: number) => void
	ariaLabel?: string
	className?: string
}

const SIZE_CLASSES: Record<StarBarSize, string> = {
	sm: 'h-4 w-4',
	md: 'h-5 w-5',
	lg: 'h-7 w-7',
}

const toOneBased = (_: unknown, index: number): number => index + 1

const clampFillPercent = (value: number | null, index: number): number => {
	if (value == null) return 0
	const portion = value - index
	if (portion <= 0) return 0
	if (portion >= 1) return 100
	return Math.round(portion * 100)
}

const ReadOnlyStar = ({
	fillPercent,
	sizeClass,
}: {
	fillPercent: number
	sizeClass: string
}) => (
	<span className={cn('relative inline-block', sizeClass)} aria-hidden>
		<Star
			className={cn('text-muted-foreground/40 absolute inset-0', sizeClass)}
			strokeWidth={1.5}
		/>
		<span
			className="absolute inset-0 overflow-hidden"
			style={{ width: `${fillPercent}%` }}
		>
			<Star
				className={cn('fill-yellow-500 text-yellow-500', sizeClass)}
				strokeWidth={1.5}
			/>
		</span>
	</span>
)

const InteractiveStar = ({
	index,
	filled,
	sizeClass,
	disabled,
	ariaLabel,
	onSelect,
	onHover,
	onLeave,
}: {
	index: number
	filled: boolean
	sizeClass: string
	disabled: boolean
	ariaLabel: string
	onSelect: () => void
	onHover: () => void
	onLeave: () => void
}) => (
	<button
		type="button"
		role="radio"
		aria-checked={filled}
		aria-label={ariaLabel}
		onClick={onSelect}
		onMouseEnter={onHover}
		onMouseLeave={onLeave}
		onFocus={onHover}
		onBlur={onLeave}
		disabled={disabled}
		className={cn(
			'inline-flex cursor-pointer items-center justify-center rounded-sm p-0.5 transition-colors',
			'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
			disabled && 'cursor-not-allowed opacity-60',
		)}
	>
		<Star
			className={cn(
				sizeClass,
				filled
					? 'fill-yellow-500 text-yellow-500'
					: 'text-muted-foreground/40',
			)}
			strokeWidth={1.5}
		/>
	</button>
)

const StarBar = ({
	value,
	max = 5,
	size = 'md',
	interactive = false,
	disabled = false,
	onChange,
	ariaLabel,
	className,
}: StarBarProps) => {
	const t = useTranslations('feedbackUi.stars')
	const [hover, setHover] = useState<number | null>(null)
	const sizeClass = SIZE_CLASSES[size]
	const indices = Array.from({ length: max }, toOneBased)

	if (!interactive) {
		const renderReadOnlyStar = (index: number) => (
			<ReadOnlyStar
				key={index}
				fillPercent={clampFillPercent(value, index - 1)}
				sizeClass={sizeClass}
			/>
		)
		return (
			<span
				className={cn('inline-flex items-center gap-0.5', className)}
				role="img"
				aria-label={ariaLabel ?? (value != null ? t('valueOfMax', { value, max }) : t('noRating'))}
			>
				{indices.map(renderReadOnlyStar)}
			</span>
		)
	}

	const handleSelect = (index: number) => () => onChange?.(index)
	const handleHover = (index: number) => () => setHover(index)
	const handleLeave = () => setHover(null)
	const activeValue = hover ?? value ?? 0

	const renderInteractiveStar = (index: number) => (
		<InteractiveStar
			key={index}
			index={index}
			filled={index <= activeValue}
			sizeClass={sizeClass}
			disabled={disabled}
			ariaLabel={t('starAriaLabel', { count: index })}
			onSelect={handleSelect(index)}
			onHover={handleHover(index)}
			onLeave={handleLeave}
		/>
	)

	return (
		<span
			className={cn('inline-flex items-center gap-1', className)}
			role="radiogroup"
			aria-label={ariaLabel ?? t('chooseRating')}
		>
			{indices.map(renderInteractiveStar)}
		</span>
	)
}

export { StarBar }
