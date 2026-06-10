'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { PresencePulse } from './presence-pulse'
import { PresenceCheckInButton } from './presence-check-in-button'
import { useVisibilityPolling } from '@/hooks/use-visibility-polling'
import type { CheckInViewer } from '@/services'

interface PresenceCardProps {
	playgroundId: string
	initialActiveCount: number
	initialViewer: CheckInViewer | null
}

function PresenceCard({
	playgroundId,
	initialActiveCount,
	initialViewer,
}: PresenceCardProps) {
	const t = useTranslations('presence')
	const router = useRouter()
	const [activeCount, setActiveCount] = useState<number>(initialActiveCount)
	const [viewer, setViewer] = useState<CheckInViewer | null>(initialViewer)

	const refresh = useCallback(() => router.refresh(), [router])
	useVisibilityPolling(refresh, 60_000)

	const handleViewerChange = (next: CheckInViewer, nextCount: number) => {
		setViewer(next)
		setActiveCount(nextCount)
	}

	const isLive = activeCount > 0

	return (
		<Card
			data-slot="presence-card"
			className={cn(
				'relative overflow-hidden border-0 shadow-sm',
				isLive
					? 'bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10'
					: 'bg-card',
			)}
		>
			{isLive && (
				<div
					className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-emerald-400/20 blur-3xl"
					aria-hidden
				/>
			)}
			<CardContent className="relative flex flex-col gap-5 p-6">
				<div className="flex items-center gap-4">
					<div
						className={cn(
							'flex size-14 shrink-0 items-center justify-center rounded-2xl',
							isLive
								? 'bg-emerald-500/15'
								: 'bg-muted',
						)}
					>
						{isLive ? (
							<PresencePulse active className="h-3.5! w-3.5!" />
						) : (
							<Users className="text-muted-foreground size-6" />
						)}
					</div>
					<div className="flex flex-col">
						<div className="flex items-baseline gap-2">
							<span
								className={cn(
									'text-4xl leading-none font-bold tabular-nums',
									isLive ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
								)}
							>
								{activeCount}
							</span>
							<span className="text-muted-foreground text-sm">
								{isLive ? t('peopleNow') : t('emptyNow')}
							</span>
						</div>
						<p className="text-muted-foreground text-xs">
							{isLive ? t('liveSubtitle') : t('quietSubtitle')}
						</p>
					</div>
				</div>
				<PresenceCheckInButton
					playgroundId={playgroundId}
					viewer={viewer}
					onChange={handleViewerChange}
				/>
			</CardContent>
		</Card>
	)
}

export { PresenceCard }
