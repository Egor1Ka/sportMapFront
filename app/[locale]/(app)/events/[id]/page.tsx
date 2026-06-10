'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import type { DurationLabels } from '@/lib/events/format-event-time'
import { ArrowLeft, Share2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EventRsvpButton } from '@/components/events/event-rsvp-button'
import { EventStatusBanner } from '@/components/events/event-status-banner'
import { EventMenu } from '@/components/events/event-menu'
import { EventEditSheet } from '@/components/events/event-edit-sheet'
import { EventTimeDisplay } from '@/components/events/event-time-display'
import { useUserOptional } from '@/lib/auth/user-provider'
import { useVisibilityPolling } from '@/hooks/use-visibility-polling'
import { formatEventTime, formatDuration } from '@/lib/events/format-event-time'
import {
	eventApi,
	sportApi,
	ApiError,
	type PlaygroundEvent,
} from '@/services'
import type { Sport } from '@/services/configs/sport.config'

type RouteParams = { id: string; locale: string }
type Props = { params: Promise<RouteParams> }

function EventLoading() {
	return (
		<article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
			<Skeleton className="h-8 w-24" />
			<Skeleton className="h-10 w-48" />
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-32 w-full" />
		</article>
	)
}

function EventNotFound({ message }: { message: string }) {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<p className="text-lg font-semibold">{message}</p>
				<Link href="/sports-map">
					<Button variant="outline">
						<ArrowLeft className="mr-2 size-4" /> Назад до карти
					</Button>
				</Link>
			</div>
		</div>
	)
}

const EventDetailPage = ({ params }: Props) => {
	const { id } = use(params)
	const t = useTranslations('events')
	const tMap = useTranslations('sportsMapUi')
	const locale = useLocale()
	const router = useRouter()
	const user = useUserOptional()
	const [event, setEvent] = useState<PlaygroundEvent | null>(null)
	const [sports, setSports] = useState<Sport[]>([])
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [editOpen, setEditOpen] = useState(false)

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			setLoading(true)
			try {
				const [eventResult, sportsResult] = await Promise.all([
					eventApi.getById({ pathParams: { id }, silent: true }),
					sportApi.list({ silent: true }),
				])
				if (cancelled) return
				setEvent(eventResult)
				setSports(sportsResult.items)
				setError(null)
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError
						? err.displayMessage
						: tMap('eventDetail.loadError')
				setError(message)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [id])

	const refresh = useCallback(() => router.refresh(), [router])
	useVisibilityPolling(refresh, 60_000)

	const handleShare = async () => {
		const url = typeof window !== 'undefined' ? window.location.href : ''
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({ url })
				return
			} catch {
				// fall through to clipboard
			}
		}
		try {
			await navigator.clipboard.writeText(url)
			toast.success(t('shareCopied'))
		} catch {
			// silent
		}
	}

	if (loading) return <EventLoading />
	const durationLabels: DurationLabels = {
		minutesShort: tMap('eventTime.minutesShort'),
		hoursShort: tMap('eventTime.hoursShort'),
	}

	if (error || !event) return <EventNotFound message={error ?? tMap('eventDetail.notFound')} />

	const time = formatEventTime(new Date(event.startAt), { locale })
	const duration = formatDuration(event.durationMin, durationLabels)
	const isCreator = user?.id === event.creator.id
	const progress = event.maxParticipants
		? Math.round((event.rsvpCount / event.maxParticipants) * 100)
		: null
	const free =
		event.maxParticipants !== null
			? event.maxParticipants - event.rsvpCount
			: null
	const creatorInitial = event.creator.name?.slice(0, 1) ?? '?'
	const participantsLabel = event.maxParticipants
		? t('participantsLimited', {
				count: event.rsvpCount,
				max: event.maxParticipants,
			})
		: t('participants', { count: event.rsvpCount })

	return (
		<article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 pb-24">
			<header className="flex items-center justify-between">
				<Button variant="ghost" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="size-4" /> {t('back')}
				</Button>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={handleShare}
						aria-label={t('share')}
					>
						<Share2 />
					</Button>
					{isCreator && (
						<EventMenu
							event={event}
							onEdit={() => setEditOpen(true)}
							onCancelled={setEvent}
						/>
					)}
				</div>
			</header>

			<EventStatusBanner status={event.status} />

			<div className="flex flex-col gap-1">
				<p
					className="text-3xl font-bold"
					style={{ color: event.sport.color ?? undefined }}
				>
					{event.sport.label}
				</p>
				<p className="text-xl font-medium">
					{time} · {duration}
				</p>
				<EventTimeDisplay
					startAt={event.startAt}
					durationMin={event.durationMin}
				/>
			</div>

			<Link
				href={`/sports-map/${event.playgroundId}`}
				className="flex items-center gap-2 rounded-lg border bg-card p-4 transition hover:border-primary/50"
			>
				<MapPin className="size-4" />
				<span className="text-sm font-medium">{tMap('eventDetail.playground')}</span>
			</Link>

			<section className="flex items-center gap-3">
				<Avatar>
					<AvatarImage src={event.creator.avatar ?? undefined} />
					<AvatarFallback>{creatorInitial}</AvatarFallback>
				</Avatar>
				<div>
					<p className="text-xs uppercase text-muted-foreground">
						{t('creator')}
					</p>
					<p className="font-medium">{event.creator.name ?? '—'}</p>
				</div>
			</section>

			{event.description && (
				<p className="whitespace-pre-line rounded-lg border bg-card p-4">
					{event.description}
				</p>
			)}

			<section className="flex flex-col gap-2">
				<p className="font-medium">{participantsLabel}</p>
				{progress !== null && <Progress value={progress} />}
				{free !== null && free > 0 && (
					<p className="text-sm text-muted-foreground">
						{t('freeSpots', { count: free })}
					</p>
				)}
			</section>

			{event.status === 'active' && (
				<div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-2xl border-t bg-background/95 p-4 backdrop-blur">
					<EventRsvpButton event={event} size="lg" className="w-full" />
				</div>
			)}

			<EventEditSheet
				open={editOpen}
				onOpenChange={setEditOpen}
				event={event}
				sports={sports}
				onSaved={setEvent}
			/>
		</article>
	)
}

export default EventDetailPage
