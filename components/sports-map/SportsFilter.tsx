'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { sportApi, type Sport } from '@/services'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type Props = {
	selectedCodes: string[]
	onChange: (codes: string[]) => void
}

const sortByOrder = (a: Sport, b: Sport) => {
	if (a.order !== b.order) return a.order - b.order
	return a.label.localeCompare(b.label)
}

const toggleCode = (codes: string[], code: string): string[] =>
	codes.includes(code) ? codes.filter((value) => value !== code) : [...codes, code]

const SportsFilter = ({ selectedCodes, onChange }: Props) => {
	const t = useTranslations('sportsMapUi')
	const [sports, setSports] = useState<Sport[]>([])

	const buildTriggerLabel = (count: number): string =>
		count === 0 ? t('filter.all') : t('filter.count', { count })

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			try {
				const result = await sportApi.list({ silent: true })
				if (cancelled) return
				setSports([...result.items].sort(sortByOrder))
			} catch {
				if (cancelled) return
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [])

	const handleReset = () => onChange([])

	const renderRow = (sport: Sport) => {
		const checked = selectedCodes.includes(sport.code)
		const handleChange = () => onChange(toggleCode(selectedCodes, sport.code))
		return (
			<label
				key={sport.code}
				className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm"
			>
				<Checkbox checked={checked} onCheckedChange={handleChange} />
				{sport.icon ? <span aria-hidden>{sport.icon}</span> : null}
				<span className="flex-1">{sport.label}</span>
			</label>
		)
	}

	return (
		<Popover>
			<PopoverTrigger
				className={cn(
					buttonVariants({ variant: 'outline', size: 'sm' }),
					'bg-card text-foreground border-border shadow-md',
				)}
			>
				{buildTriggerLabel(selectedCodes.length)}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">{t('filter.heading')}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReset}
						disabled={selectedCodes.length === 0}
					>
						{t('filter.reset')}
					</Button>
				</div>
				<ScrollArea className="h-72">
					<div className="flex flex-col">{sports.map(renderRow)}</div>
				</ScrollArea>
			</PopoverContent>
		</Popover>
	)
}

export default SportsFilter
