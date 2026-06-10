'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EventRsvpButton } from './event-rsvp-button'
import { formatEventTime, formatDuration } from '@/lib/events/format-event-time'
import type { PlaygroundEvent } from '@/services'

interface EventCardProps {
	event: PlaygroundEvent
	locale: string
	onChanged?: () => void | Promise<void>
}

const stopPropagation = (event: React.MouseEvent) => event.stopPropagation()

function EventCard({ event, locale, onChanged }: EventCardProps) {
	const t = useTranslations('events')
	const tMap = useTranslations('sportsMapUi')
	const time = formatEventTime(new Date(event.startAt), { locale })
	const duration = formatDuration(event.durationMin, {
		minutesShort: tMap('eventTime.minutesShort'),
		hoursShort: tMap('eventTime.hoursShort'),
	})
	const participants = event.maxParticipants
		? t('participantsLimited', {
				count: event.rsvpCount,
				max: event.maxParticipants,
			})
		: t('participants', { count: event.rsvpCount })
	const creatorName = event.creator.name ?? '—'
	const creatorInitial = creatorName.slice(0, 1)
	const sportColor = event.sport.color ?? '#64748b'
	const isCancelled = event.status === 'cancelled'

	return (
		<Link
			href={`/events/${event.id}`}
			className="block focus-visible:outline-none"
			data-slot="event-card"
		>
			<Card
				className={cn(
					'group relative overflow-hidden border transition-all',
					'hover:border-primary/40 hover:shadow-md',
					isCancelled && 'opacity-60',
				)}
			>
				<span
					aria-hidden
					className="absolute inset-y-0 left-0 w-1 rounded-r-full"
					style={{ background: sportColor }}
				/>

				<CardContent className="flex flex-col gap-4 p-5 pl-6">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3">
							<div
								className="flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl"
								style={{ background: `${sportColor}1a` }}
							>
								<span aria-hidden>{event.sport.icon ?? '🏅'}</span>
							</div>
							<div className="flex flex-col gap-0.5">
								<p
									className="text-base leading-tight font-semibold"
									style={{ color: sportColor }}
								>
									{event.sport.label}
								</p>
								<p className="text-foreground text-lg leading-tight font-bold tabular-nums">
									{time}{' '}
									<span className="text-muted-foreground text-sm font-medium">
										· {duration}
									</span>
								</p>
							</div>
						</div>

						{isCancelled && (
							<Badge variant="destructive" className="shrink-0">
								{t('cancelled')}
							</Badge>
						)}
					</div>

					{event.description && (
						<p className="text-foreground/80 line-clamp-2 text-sm italic">
							«{event.description}»
						</p>
					)}

					<div className="flex items-center justify-between gap-3 pt-1">
						<div className="flex items-center gap-2 text-sm">
							<Avatar className="size-7 ring-2 ring-background">
								<AvatarImage src={event.creator.avatar ?? undefined} />
								<AvatarFallback className="text-xs">
									{creatorInitial}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col leading-tight">
								<span className="text-foreground text-xs font-medium">
									{creatorName}
								</span>
								<span className="text-muted-foreground flex items-center gap-1 text-xs">
									<Users className="size-3" />
									{participants}
								</span>
							</div>
						</div>

						<div onClick={stopPropagation}>
							<EventRsvpButton
								event={event}
								size="sm"
								onChanged={onChanged}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	)
}

export { EventCard }
