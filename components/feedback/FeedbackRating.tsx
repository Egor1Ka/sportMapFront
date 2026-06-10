'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { ratingApi, ApiError, type RatingAggregate } from '@/services'
import { StarBar } from '@/components/ratings/StarBar'

const formatAverage = (value: number | null): string => {
	if (value == null) return '—'
	return value.toFixed(1)
}

const loadMyRating = async (
	targetType: string,
	targetId: string,
): Promise<number | null> => {
	try {
		const params = new URLSearchParams({ targetType, targetId })
		const response = await fetch(`/api/ratings/me?${params.toString()}`, {
			credentials: 'include',
		})
		if (!response.ok) return null
		const payload = (await response.json()) as { value?: number | null }
		return typeof payload.value === 'number' ? payload.value : null
	} catch {
		return null
	}
}

type FeedbackRatingProps = {
	targetType: 'playground'
	targetId: string
	meId: string | null
}

const FeedbackRating = ({ targetType, targetId, meId }: FeedbackRatingProps) => {
	const t = useTranslations('feedbackUi.rating')
	const [aggregate, setAggregate] = useState<RatingAggregate | null>(null)
	const [myValue, setMyValue] = useState<number | null>(null)
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			try {
				const [aggregateRes, myRatingRes] = await Promise.all([
					ratingApi.getAggregate({
						queryParams: { targetType, targetId },
						silent: true,
					}),
					meId ? loadMyRating(targetType, targetId) : Promise.resolve(null),
				])
				if (cancelled) return
				setAggregate(aggregateRes)
				setMyValue(myRatingRes)
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError ? err.displayMessage : t('loadError')
				toast.error(message)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [targetType, targetId, meId, t])

	const refetchAggregate = async () => {
		try {
			const res = await ratingApi.getAggregate({
				queryParams: { targetType, targetId },
				silent: true,
			})
			setAggregate(res)
		} catch {
			// silent: aggregate refresh failure leaves stale data but submission already succeeded
		}
	}

	const handleRate = async (value: number) => {
		if (submitting) return
		setSubmitting(true)
		try {
			await ratingApi.upsert({
				body: { targetType, targetId, value },
			})
			setMyValue(value)
			await refetchAggregate()
			toast.success(t('toastThankYou'))
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		} finally {
			setSubmitting(false)
		}
	}

	const hasRatings = aggregate != null && aggregate.count > 0

	return (
		<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
			<div className="flex flex-col gap-2">
				{hasRatings ? (
					<>
						<div className="flex items-baseline gap-3">
							<span className="text-4xl font-semibold tracking-tight">
								{formatAverage(aggregate.average)}
							</span>
							<StarBar value={aggregate.average} size="md" />
						</div>
						<span className="text-muted-foreground text-sm">
							{t('ratingsCount', { count: aggregate.count })}
						</span>
					</>
				) : (
					<>
						<StarBar value={null} size="md" />
						<span className="text-muted-foreground text-sm italic">
							{t('noRatings')}
						</span>
					</>
				)}
			</div>

			{meId ? (
				<div className="flex flex-col items-start gap-2 md:items-end">
					<span className="text-muted-foreground text-sm">{t('yourRatingLabel')}</span>
					<StarBar
						value={myValue}
						interactive
						disabled={submitting}
						onChange={handleRate}
						size="lg"
						ariaLabel={t('yourRatingLabel')}
					/>
				</div>
			) : null}
		</div>
	)
}

export { FeedbackRating }
