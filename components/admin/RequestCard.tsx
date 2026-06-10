'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { formatDistanceToNow } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale/uk'
import { enUS } from 'date-fns/locale/en-US'
import { Check, Loader2, X } from 'lucide-react'

import type {
	EditRequestWithPlayground,
	EditRequestDiff,
	Playground,
	PlaygroundAddress,
} from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { RequestDiffRow } from './RequestDiffRow'

type Props = {
	pair: EditRequestWithPlayground
	pending: boolean
	resolved?: boolean
	onApprove: (id: string) => void
	onReject: (id: string) => void
}

type DiffRow = {
	key: string
	label: string
	before: string
	after: string
}

const EMPTY_PLACEHOLDER = '—'

const formatString = (value: string | null | undefined): string => {
	if (value === null || value === undefined) return EMPTY_PLACEHOLDER
	const trimmed = value.trim()
	return trimmed.length === 0 ? EMPTY_PLACEHOLDER : trimmed
}

const formatNumber = (value: number | null | undefined): string => {
	if (value === null || value === undefined) return EMPTY_PLACEHOLDER
	return value.toFixed(6)
}

const addressFieldKeys: Array<keyof Pick<PlaygroundAddress, 'city' | 'district' | 'street' | 'fullAddress'>> = [
	'fullAddress',
	'city',
	'district',
	'street',
]

const buildStringRow = (
	key: string,
	label: string,
	before: string | null,
	after: string | null | undefined,
): DiffRow | null => {
	if (after === undefined) return null
	if (formatString(before) === formatString(after)) return null
	return { key, label, before: formatString(before), after: formatString(after) }
}

const buildNumberRow = (
	key: string,
	label: string,
	before: number | null,
	after: number | undefined,
): DiffRow | null => {
	if (after === undefined) return null
	if (formatNumber(before) === formatNumber(after)) return null
	return { key, label, before: formatNumber(before), after: formatNumber(after) }
}

const buildAddressRows = (
	current: PlaygroundAddress,
	proposed: Partial<PlaygroundAddress> | undefined,
	labels: Record<keyof Pick<PlaygroundAddress, 'city' | 'district' | 'street' | 'fullAddress'>, string>,
): DiffRow[] => {
	if (!proposed) return []
	const collect = (acc: DiffRow[], key: typeof addressFieldKeys[number]): DiffRow[] => {
		const row = buildStringRow(`address.${key}`, labels[key], current[key], proposed[key])
		return row ? [...acc, row] : acc
	}
	return addressFieldKeys.reduce(collect, [])
}

const buildRows = (
	playground: Playground,
	diff: EditRequestDiff,
	labels: {
		name: string
		description: string
		address: string
		fullAddress: string
		city: string
		district: string
		street: string
		lat: string
		lng: string
	},
): DiffRow[] => {
	const nameRow = buildStringRow('name', labels.name, playground.name, diff.name)
	const descRow = buildStringRow('description', labels.description, playground.description, diff.description)
	const addressRows = buildAddressRows(playground.address, diff.address, {
		fullAddress: `${labels.address}: ${labels.fullAddress}`,
		city: `${labels.address}: ${labels.city}`,
		district: `${labels.address}: ${labels.district}`,
		street: `${labels.address}: ${labels.street}`,
	})
	const latRow = buildNumberRow('lat', labels.lat, playground.lat, diff.lat)
	const lngRow = buildNumberRow('lng', labels.lng, playground.lng, diff.lng)

	return [nameRow, descRow, ...addressRows, latRow, lngRow].filter(
		(row): row is DiffRow => row !== null,
	)
}

function RequestCard({ pair, pending, resolved = false, onApprove, onReject }: Props) {
	const t = useTranslations('admin.requests')
	const locale = useLocale()
	const dateLocale = locale === 'uk' ? ukLocale : enUS

	const labels = {
		name: t('field.name'),
		description: t('field.description'),
		address: t('field.address'),
		fullAddress: t('field.fullAddress'),
		city: t('field.city'),
		district: t('field.district'),
		street: t('field.street'),
		lat: t('field.lat'),
		lng: t('field.lng'),
	}

	const rows = buildRows(pair.playground, pair.request.diff, labels)
	const allUnchanged = rows.length === 0
	const playgroundName = pair.playground.name ?? t('playgroundFallbackName')
	const createdAt = new Date(pair.request.createdAt)
	const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocale })

	const handleApprove = () => onApprove(pair.request.id)
	const handleReject = () => onReject(pair.request.id)

	return (
		<Card data-slot="request-card" data-resolved={resolved || undefined}>
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<Link
							href={`/sports-map/${pair.playground.id}`}
							className="hover:text-primary text-base font-semibold transition-colors"
						>
							{playgroundName}
						</Link>
						<p className="text-muted-foreground mt-1 text-xs">
							{t('proposedBy')}: <span className="font-medium">{pair.request.authorName ?? pair.request.authorEmail ?? pair.request.authorId}</span>
							{' · '}
							{timeAgo}
						</p>
					</div>
					{!resolved && (
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleReject}
								disabled={pending}
							>
								{pending ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<X className="size-3.5" />
								)}
								{t('reject')}
							</Button>
							<Button type="button" size="sm" onClick={handleApprove} disabled={pending || allUnchanged}>
								{pending ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Check className="size-3.5" />
								)}
								{t('approve')}
							</Button>
						</div>
					)}
				</div>
			</CardHeader>
			<Separator />
			<CardContent className="pt-4">
				{allUnchanged ? (
					<p className="text-muted-foreground text-sm">{t('allFieldsUnchanged')}</p>
				) : (
					<div className="space-y-1">
						{rows.map((row) => (
							<RequestDiffRow
								key={row.key}
								label={row.label}
								before={row.before}
								after={row.after}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

export { RequestCard }
