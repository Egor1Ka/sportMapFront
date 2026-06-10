'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { eventApi, ApiError } from '@/services'
import { useUserOptional } from '@/lib/auth/user-provider'
import type { PlaygroundEvent, EventRsvpResponse } from '@/services'

interface EventRsvpButtonProps {
	event: PlaygroundEvent
	size?: 'sm' | 'default' | 'lg'
	className?: string
	onChange?: (next: EventRsvpResponse) => void
	onChanged?: () => void | Promise<void>
}

const isEventFullError = (err: ApiError): boolean => {
	const data = err.data as { code?: string } | undefined
	return data?.code === 'eventFull'
}

const goToLogin = () => {
	const returnTo =
		typeof window !== 'undefined' ? window.location.pathname : '/'
	window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
}

function EventRsvpButton({
	event,
	size = 'default',
	className,
	onChange,
	onChanged,
}: EventRsvpButtonProps) {
	const t = useTranslations('events')
	const user = useUserOptional()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [busy, setBusy] = useState(false)
	const [isRsvped, setIsRsvped] = useState(event.viewer?.isRsvped ?? false)
	const [isFull, setIsFull] = useState(event.isFull)

	if (event.status !== 'active') {
		return null
	}

	if (!user) {
		return (
			<Button size={size} className={className} onClick={goToLogin}>
				{t('loginToJoin')}
			</Button>
		)
	}

	const performToggle = async (clickEvent: React.MouseEvent) => {
		clickEvent.stopPropagation()
		clickEvent.preventDefault()
		setBusy(true)
		const next = !isRsvped
		setIsRsvped(next)
		try {
			const result = next
				? await eventApi.rsvp({ pathParams: { id: event.id } })
				: await eventApi.unrsvp({ pathParams: { id: event.id } })
			setIsFull(result.isFull)
			onChange?.(result)
			void onChanged?.()
			startTransition(() => router.refresh())
		} catch (err) {
			setIsRsvped(!next)
			if (err instanceof ApiError && isEventFullError(err)) {
				setIsFull(true)
			} else if (!(err instanceof ApiError)) {
				throw err
			}
		} finally {
			setBusy(false)
		}
	}

	if (isFull && !isRsvped) {
		return (
			<Button size={size} variant="outline" disabled className={className}>
				{t('rsvpFull')}
			</Button>
		)
	}

	return (
		<Button
			size={size}
			variant={isRsvped ? 'secondary' : 'default'}
			disabled={busy || isPending}
			onClick={performToggle}
			className={className}
		>
			{isRsvped ? t('rsvpYouAreGoing') : t('rsvpGoing')}
		</Button>
	)
}

export { EventRsvpButton }
