'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

type Variant = 'icon' | 'pill'

type Props = {
	variant?: Variant
	className?: string
}

const SIZE_BY_VARIANT: Record<Variant, string> = {
	icon: 'h-9 w-9',
	pill: 'h-8 px-3 gap-1.5',
}

export function ThemeToggle({ variant = 'icon', className }: Props) {
	const { theme, setTheme, resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		const markMounted = () => setMounted(true)
		markMounted()
	}, [])

	const activeTheme = theme === 'system' ? resolvedTheme : theme
	const isDark = activeTheme === 'dark'
	const nextTheme = isDark ? 'light' : 'dark'
	const ariaLabel = mounted ? `Switch to ${nextTheme} mode` : 'Toggle theme'

	const handleClick = () => setTheme(nextTheme)

	return (
		<button
			type="button"
			aria-label={ariaLabel}
			onClick={handleClick}
			className={cn(
				'border-border/60 hover:border-border bg-background/40 text-foreground/70 hover:text-foreground inline-flex items-center justify-center rounded-full border backdrop-blur-md transition-all',
				SIZE_BY_VARIANT[variant],
				className,
			)}
		>
			{mounted ? (
				isDark ? (
					<Sun className="h-4 w-4" />
				) : (
					<Moon className="h-4 w-4" />
				)
			) : (
				<span className="h-4 w-4" />
			)}
			{variant === 'pill' && (
				<span className="font-mono text-[10px] tracking-widest uppercase">
					{mounted ? (isDark ? 'Light' : 'Dark') : ''}
				</span>
			)}
		</button>
	)
}
