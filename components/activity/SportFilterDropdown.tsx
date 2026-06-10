'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { sportApi, type Sport } from '@/services'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { pickSportEmoji } from './sport-emojis'

const ALL_VALUE = '__all__'

const useSports = () => {
	const [sports, setSports] = useState<Sport[]>([])
	const cancelledRef = useRef(false)

	useEffect(() => {
		cancelledRef.current = false
		const load = async () => {
			try {
				const response = await sportApi.list({ silent: true })
				if (cancelledRef.current) return
				setSports(response.items)
			} catch {
				// Toast interceptor surfaces errors; nothing else to do here.
			}
		}
		load()
		return () => {
			cancelledRef.current = true
		}
	}, [])

	return sports
}

const buildQuery = (searchParams: URLSearchParams, code: string): string => {
	const params = new URLSearchParams(searchParams.toString())
	if (code === ALL_VALUE) params.delete('sport')
	else params.set('sport', code)
	return params.toString()
}

const sportLabel = (sport: Sport): string =>
	`${pickSportEmoji(sport.code)} ${sport.label}`

const renderSportItem = (sport: Sport) => (
	<SelectItem key={sport.code} value={sport.code}>
		{sportLabel(sport)}
	</SelectItem>
)

const findSport = (sports: Sport[], code: string): Sport | undefined =>
	sports.find((sport) => sport.code === code)

const SportFilterDropdown = () => {
	const t = useTranslations('activity.filters')
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const selectedCode = searchParams.get('sport') ?? ALL_VALUE
	const sports = useSports()

	const handleChange = useCallback(
		(value: string | null) => {
			if (!value) return
			const query = buildQuery(searchParams, value)
			const href = query ? `${pathname}?${query}` : pathname
			router.replace(href, { scroll: false })
		},
		[pathname, router, searchParams],
	)

	const displayLabel = useMemo(() => {
		if (selectedCode === ALL_VALUE) return t('all')
		const sport = findSport(sports, selectedCode)
		if (!sport) return t('all')
		return sportLabel(sport)
	}, [selectedCode, sports, t])

	return (
		<div className="border-b px-4 py-3">
			<Select value={selectedCode} onValueChange={handleChange}>
				<SelectTrigger className="w-full sm:w-[240px]">
					<SelectValue placeholder={t('all')}>{displayLabel}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>{t('all')}</SelectItem>
					{sports.map(renderSportItem)}
				</SelectContent>
			</Select>
		</div>
	)
}

export { SportFilterDropdown }
